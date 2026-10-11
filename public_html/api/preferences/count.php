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
$owner = preferenceOwner($user);

try {
    $db = preferencesDb();

    $stmt = $db->prepare('SELECT COUNT(*) FROM user_preferences WHERE owner_key = :owner');
    $stmt->execute([':owner' => $owner]);

    successResponse([
        'count' => (int) $stmt->fetchColumn(),
    ], 'Preference count retrieved');

} catch (Throwable $e) {
    dbErrorResponse($e, 'preferences/count.php', ['owner' => $owner]);
}