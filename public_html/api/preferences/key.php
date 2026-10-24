<?php
/**
 * Preferences API - Key
 *
 * GET /api/preferences/key.php?index=0
 *
 * Returns the key name at the given index, mirroring localStorage.key(index).
 * Out-of-range indexes return null rather than an error, matching the
 * Web Storage specification, which returns null when no key exists at index.
 */

require_once __DIR__ . '/bootstrap.php';

handleCors();
requireMethod('GET');

$user = requireAuth();
$owners = preferenceOwners($user);

try {
    $rawIndex = getParam('index', 0);

    if (!is_numeric($rawIndex)) {
        errorResponse('Invalid index. Expected a non-negative integer.', 422);
    }

    $index = (int) $rawIndex;

    if ($index < 0) {
        errorResponse('Invalid index. Expected a non-negative integer.', 422);
    }

    $db = preferencesDb();

    // $index is already validated as a non-negative integer above, so it is
    // safe to inline. Binding it as a placeholder is avoided deliberately:
    // with ATTR_EMULATE_PREPARES = false, LIMIT/OFFSET markers are not
    // portable across MySQL/MariaDB.
    $stmt = $db->prepare(
        'SELECT pref_key FROM user_preferences
         WHERE owner_key IN (:clinic_owner, :principal_owner)
         GROUP BY pref_key
         ORDER BY pref_key ASC
         LIMIT 1 OFFSET ' . $index
    );
    $stmt->execute([
        ':clinic_owner' => $owners[0],
        ':principal_owner' => $owners[count($owners) - 1],
    ]);

    $key = $stmt->fetchColumn();

    successResponse([
        'key'   => $key === false ? null : (string) $key,
        'index' => $index,
    ], 'Preference key retrieved');

} catch (Throwable $e) {
    dbErrorResponse($e, 'preferences/key.php', ['owners' => $owners]);
}