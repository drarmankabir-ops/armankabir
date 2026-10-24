<?php
/**
 * Preferences API - Shared Bootstrap
 *
 * Loaded by every endpoint in this directory. Provides:
 *   - ensurePreferencesSchema() : self-healing table creation (no manual SQL)
 *   - preferenceOwner()        : resolves the authenticated principal
 *   - assertPreferenceKey()    : validates the key + rejects credential material
 *
 * The store separates shared clinic records from personal account preferences.
 * Patient sessions remain isolated from staff and clinic-wide records.
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth/middleware.php';

/**
 * Largest single preference value accepted (bytes).
 * Generous for base64 image/PDF assets, bounded to protect MySQL and quotas.
 */
const PREFERENCE_MAX_VALUE_BYTES = 1048576; // 1 MiB

/**
 * Longest accepted key (bytes).
 */
const PREFERENCE_MAX_KEY_BYTES = 191;

/**
 * Keys that must never be persisted in the preference store.
 *
 * Authentication material belongs in the HttpOnly PHP session cookie. Storing
 * any of these would reintroduce the token-in-browser-storage vulnerability.
 */
function forbiddenPreferenceKeys(): array
{
    return [
        'staff_auth',
        'phpAuthToken',
        'auth_token',
        'access_token',
        'refresh_token',
        'session_token',
        'jwt',
        'id_token',
        'medicare_current_doctor',
        'medicare_logged_in_doctor',
        'password',
        'password_hash',
        'secret',
        'api_key',
        'csrf_token',
    ];
}

/**
 * Create the user_preferences table when it is missing.
 *
 * Mirrors the ensureUsersSchema() self-healing convention so the endpoints work
 * on a freshly restored database without a manual phpMyAdmin import.
 * Uses CREATE TABLE IF NOT EXISTS, so it is safe on every request.
 *
 * @return array{ok:bool,created:bool,error:?string}
 */
function ensurePreferencesSchema(PDO $db): array
{
    $result = ['ok' => true, 'created' => false, 'error' => null];

    try {
        $dbName = (string) $db->query('SELECT DATABASE()')->fetchColumn();
        if ($dbName === '') {
            $result['ok'] = false;
            $result['error'] = 'No database selected';
            return $result;
        }

        $check = $db->prepare(
            'SELECT COUNT(*) FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = \'user_preferences\''
        );
        $check->execute([$dbName]);

        if ((int) $check->fetchColumn() > 0) {
            return $result;
        }

        $db->exec(
            'CREATE TABLE IF NOT EXISTS `user_preferences` (
                `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                `owner_key` VARCHAR(191) NOT NULL,
                `pref_key` VARCHAR(191) NOT NULL,
                `pref_value` LONGTEXT NOT NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uk_owner_pref_key` (`owner_key`, `pref_key`),
                INDEX `idx_owner_key` (`owner_key`),
                INDEX `idx_updated_at` (`updated_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        $result['created'] = true;
        authErrorNotice('ensurePreferencesSchema', 'Created missing user_preferences table');
    } catch (Throwable $e) {
        $result['ok'] = false;
        $result['error'] = $e->getMessage();
        authError('ensurePreferencesSchema', $e->getMessage());
    }

    return $result;
}

/**
 * Resolve an authenticated principal and preference key into an ownership key.
 *
 * Prefixes keep the namespace unambiguous so a staff id of "3" can never
 * collide with a patient id of "3".
 *
 * @return string e.g. "clinic:1", "user:12", "patient:45"
 */
function isPersonalPreferenceKey(string $key): bool
{
    $key = strtolower($key);
    if (str_starts_with($key, 'session:')) {
        return true;
    }

    return in_array($key, [
        'theme',
        'sidebar_collapsed',
        'sidebar_state',
        'patient_language',
        'language',
        'user_id',
        'app_current_user_email',
        'medicare_last_sync',
        'medicare_last_sync_at',
        'medicare_last_login',
    ], true);
}

/**
 * Shared legacy clinical/operational records use a clinic-wide namespace for
 * staff accounts. Personal UI/session preferences remain per account.
 */
function preferenceOwner(?array $user, ?string $key = null): string
{
    if (!$user) {
        errorResponse('Authentication required. Please log in.', 401);
    }

    $type = (string) ($user['session_type'] ?? 'user');

    $id = null;
    if ($type === 'patient') {
        $id = $user['patient_id'] ?? null;
    } else {
        $id = $user['id'] ?? null;
    }

    if ($id === null || (int) $id <= 0) {
        authError('preferences', 'Authenticated principal has no usable id', [
            'session_type' => $type,
            'request_id'   => getRequestId(),
        ]);
        errorResponse('Unable to resolve the current account. Please sign in again.', 401);
    }

    if ($type === 'user' && $key !== null && !isPersonalPreferenceKey($key)) {
        return 'clinic:1';
    }

    return $type . ':' . (int) $id;
}

/**
 * Storage scopes visible to the authenticated principal.
 *
 * @return string[]
 */
function preferenceOwners(?array $user): array
{
    if (!$user) {
        errorResponse('Authentication required. Please log in.', 401);
    }

    $type = (string) ($user['session_type'] ?? 'user');
    $owner = preferenceOwner($user);
    if ($type === 'user') {
        return ['clinic:1', $owner];
    }

    return [$owner];
}

/**
 * Validate and normalise a preference key.
 *
 * Rejects empty/oversized keys and any key that would persist credentials.
 * The key is stored verbatim (no HTML escaping) because it is an opaque
 * identifier, not user-facing text; it is always bound as a SQL parameter.
 */
function assertPreferenceKey(mixed $key): string
{
    if (!is_string($key)) {
        errorResponse('Invalid preference key. A string is required.', 422);
    }

    $key = trim($key);

    if ($key === '') {
        errorResponse('Invalid preference key. The key must not be empty.', 422);
    }

    if (strlen($key) > PREFERENCE_MAX_KEY_BYTES) {
        errorResponse('Invalid preference key. The key is too long.', 422);
    }

    // Control characters would corrupt logs and make keys ambiguous.
    if (preg_match('/[\x00-\x1F\x7F]/', $key) === 1) {
        errorResponse('Invalid preference key. Control characters are not allowed.', 422);
    }

    $forbiddenKeys = array_map('strtolower', forbiddenPreferenceKeys());
    if (in_array(strtolower($key), $forbiddenKeys, true)) {
        authError('preferences', 'Rejected attempt to persist credential material', [
            'key'        => $key,
            'request_id' => getRequestId(),
        ]);
        errorResponse(
            'This key cannot be stored. Authentication data must remain in the secure session.',
            422
        );
    }

    return $key;
}

/**
 * Validate a preference value and return the exact string to persist.
 *
 * Accepts strings verbatim. Arrays/objects are JSON-encoded by the caller and
 * arrive here as strings. Enforces a hard size ceiling.
 */
function assertPreferenceValue(mixed $value): string
{
    if ($value === null) {
        return '';
    }

    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }

    if (is_int($value) || is_float($value)) {
        return (string) $value;
    }

    if (!is_string($value)) {
        errorResponse('Invalid preference value. A string, number or boolean is required.', 422);
    }

    if (strlen($value) > PREFERENCE_MAX_VALUE_BYTES) {
        errorResponse(
            'The preference value is too large to store (' . PREFERENCE_MAX_VALUE_BYTES . ' bytes maximum).',
            413
        );
    }

    // Reject malformed UTF-8 so json_encode() cannot fail later and silently
    // drop the row.
    if (!mb_check_encoding($value, 'UTF-8')) {
        errorResponse('Invalid preference value. The value must be valid UTF-8 text.', 422);
    }

    return $value;
}

/**
 * Open a connection with the preferences table guaranteed to exist.
 */
function preferencesDb(): PDO
{
    $db = Database::getInstance();

    $schema = ensurePreferencesSchema($db);
    if (!$schema['ok']) {
        errorResponse(
            'The preferences store is unavailable. Please contact the administrator.',
            503
        );
    }

    return $db;
}