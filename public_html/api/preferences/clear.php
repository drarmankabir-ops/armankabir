<?php
/**
 * Preferences API - Clear
 *
 * POST /api/preferences/clear.php
 *
 * Removes the caller's personal preferences. Clinic-wide records are preserved
 * because one staff member must not be able to erase shared operational data.
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