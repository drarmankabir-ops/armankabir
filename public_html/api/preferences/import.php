<?php
/**
 * POST /api/preferences/import.php
 *
 * Imports a bounded batch of legacy browser values for the authenticated user.
 * Existing PHP values win, making retries safe and preventing stale browsers
 * from overwriting data already migrated to the server.
 */

require_once __DIR__ . '/bootstrap.php';

handleCors();
requireMethod('POST');

$user = requireAuth();
$owners = preferenceOwners($user);
$input = getJsonInput();
$entries = $input['entries'] ?? null;

if (!is_array($entries) || count($entries) < 1 || count($entries) > 20) {
    errorResponse('Provide between 1 and 20 migration entries.', 422);
}

$validatedEntries = [];
foreach ($entries as $entry) {
    if (!is_array($entry) || !array_key_exists('key', $entry) || !array_key_exists('value', $entry)) {
        errorResponse('Each migration entry requires a key and value.', 422);
    }

    $rawKey = $entry['key'];
    if (!is_string($rawKey)) {
        errorResponse('Every migration key must be a string.', 422);
    }

    $normalisedKey = strtolower(trim($rawKey));
    $forbiddenKeys = array_map('strtolower', forbiddenPreferenceKeys());
    if (in_array($normalisedKey, $forbiddenKeys, true)) {
        errorResponse('Credential data cannot be imported.', 422);
    }

    if (!is_string($entry['value'])
        || strlen($entry['value']) > PREFERENCE_MAX_VALUE_BYTES
        || !mb_check_encoding($entry['value'], 'UTF-8')) {
        errorResponse('Every migration value must be valid UTF-8 text no larger than 1 MiB.', 422);
    }

    $validatedEntries[] = [
        'key' => assertPreferenceKey($rawKey),
        'value' => $entry['value'],
    ];
}

try {
    $db = preferencesDb();
    $db->beginTransaction();
    $stmt = $db->prepare(
        'INSERT IGNORE INTO user_preferences (owner_key, pref_key, pref_value)
         VALUES (:owner, :key, :value)'
    );
    $imported = 0;

    foreach ($validatedEntries as $entry) {
        $stmt->execute([
            ':owner' => preferenceOwner($user, $entry['key']),
            ':key' => $entry['key'],
            ':value' => assertPreferenceValue($entry['value']),
        ]);
        $imported += $stmt->rowCount();
    }

    $db->commit();
    successResponse(['imported' => $imported], 'Legacy data imported');
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    dbErrorResponse($e, 'preferences/import.php', ['owners' => $owners]);
}
