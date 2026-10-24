<?php
/**
 * Preferences API - Remove
 *
 * POST /api/preferences/remove.php
 * Body: { "key": "theme" }
 *
 * localStorage.removeItem() is idempotent: removing an absent key is a no-op,
 * not an error. Removing a key that does not exist therefore succeeds.
 */

require_once __DIR__ . '/bootstrap.php';

handleCors();
requireMethod('POST');

$user = requireAuth();

try {
    $input = getJsonInput();

    $missing = validateRequired($input, ['key']);
    if ($missing) {
        errorResponse('Missing required fields', 400, ['missing_fields' => $missing]);
    }

    $key = assertPreferenceKey($input['key']);
    $owner = preferenceOwner($user, $key);

    $db = preferencesDb();

    $stmt = $db->prepare(
        'DELETE FROM user_preferences
         WHERE pref_key = :key AND owner_key IN (:owner, :legacy_owner)'
    );
    $stmt->execute([
        ':owner' => $owner,
        ':legacy_owner' => preferenceOwner($user),
        ':key'   => $key,
    ]);

    successResponse([
        'key'      => $key,
        'removed'  => $stmt->rowCount(),
    ], 'Preference removed');

} catch (Throwable $e) {
    dbErrorResponse($e, 'preferences/remove.php', ['owner' => $owner]);
}