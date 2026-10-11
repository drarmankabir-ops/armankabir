<?php
/**
 * Preferences API - Clear
 *
 * POST /api/preferences/clear.php
 *
 * Removes every preference owned by the authenticated principal.
 * Scoped to the caller, so one user can never wipe another user's data.
 */

require_once __DIR__ . '/bootstrap.php';

handleCors();
requireMethod('POST');

$user = requireAuth();
$owner = preferenceOwner($user);

try {
    $db = preferencesDb();

    $stmt = $db->prepare('DELETE FROM user_preferences WHERE owner_key = :owner');
    $stmt->execute([':owner' => $owner]);

    $removed = $stmt->rowCount();

    successResponse([
        'cleared' => $removed,
    ], $removed > 0 ? 'Preferences cleared' : 'No preferences to clear');

} catch (Throwable $e) {
    dbErrorResponse($e, 'preferences/clear.php', ['owner' => $owner]);
}