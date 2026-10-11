<?php
/**
 * Preferences API - Set
 *
 * POST /api/preferences/set.php
 * Body: { "key": "theme", "value": "dark" }
 *
 * Upserts one preference for the authenticated principal.
 * The value is stored as an opaque string exactly as received.
 */

require_once __DIR__ . '/bootstrap.php';

handleCors();
requireMethod('POST');

$user = requireAuth();
$owner = preferenceOwner($user);

try {
    $input = getJsonInput();

    $missing = validateRequired($input, ['key']);
    if ($missing) {
        errorResponse('Missing required fields', 400, ['missing_fields' => $missing]);
    }

    $key = assertPreferenceKey($input['key']);

    if (!array_key_exists('value', $input)) {
        errorResponse('Missing required fields', 400, ['missing_fields' => ['value']]);
    }

    // Arrays/objects are JSON-encoded so structured preferences round-trip.
    $rawValue = $input['value'];
    if (is_array($rawValue) || is_object($rawValue)) {
        $encoded = json_encode($rawValue, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($encoded === false) {
            errorResponse('The preference value could not be encoded.', 422);
        }
        $rawValue = $encoded;
    }

    $value = assertPreferenceValue($rawValue);

    $db = preferencesDb();

    $stmt = $db->prepare(
        'INSERT INTO user_preferences (owner_key, pref_key, pref_value)
         VALUES (:owner, :key, :value)
         ON DUPLICATE KEY UPDATE
             pref_value = VALUES(pref_value),
             updated_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute([
        ':owner' => $owner,
        ':key'   => $key,
        ':value' => $value,
    ]);

    successResponse([
        'key'   => $key,
        'value' => $value,
    ], 'Preference saved');

} catch (Throwable $e) {
    dbErrorResponse($e, 'preferences/set.php', ['owner' => $owner]);
}