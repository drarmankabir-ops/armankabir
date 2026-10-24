<?php
/**
 * Preferences API - Count
 *
 * GET /api/preferences/count.php
 *
 * Number of preferences stored for the authenticated principal.
 * Mirrors localStorage.length, which counts keys for the current origin only.
 */

require_once __DIR__ . '/bootstrap.php';

handleCors();
requireMethod('GET');

$user = requireAuth();
$owners = preferenceOwners($user);

try {
    $db = preferencesDb();

    $stmt = $db->prepare(
        'SELECT COUNT(DISTINCT pref_key) FROM user_preferences
         WHERE owner_key IN (:clinic_owner, :principal_owner)'
    );
    $stmt->execute([
        ':clinic_owner' => $owners[0],
        ':principal_owner' => $owners[count($owners) - 1],
    ]);

    successResponse([
        'count' => (int) $stmt->fetchColumn(),
    ], 'Preference count retrieved');

} catch (Throwable $e) {
    dbErrorResponse($e, 'preferences/count.php', ['owners' => $owners]);
}