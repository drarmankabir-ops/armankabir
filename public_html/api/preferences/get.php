<?php
/**
 * Preferences API - Get
 *
 * GET /api/preferences/get.php?key=theme
 *
 * Returns a single preference for the authenticated principal.
 * Values are always returned as strings; the caller decides how to parse.
 *
 * Response (single key):
 *   { "success": true, "data": { "value": "dark", "found": true } }
 *
 * A missing key is NOT an error: localStorage.getItem() returns null for an
 * unknown key, so the adapter contract requires 200 with value = null.
 */

require_once __DIR__ . '/bootstrap.php';

handleCors();
requireMethod('GET');

$user = requireAuth();
$key = assertPreferenceKey(getParam('key'));
$owner = preferenceOwner($user, $key);

try {
    $db = preferencesDb();

    $stmt = $db->prepare(
        'SELECT pref_value FROM user_preferences
         WHERE owner_key = :owner AND pref_key = :key
         LIMIT 1'
    );
    $stmt->execute([
        ':owner' => $owner,
        ':key'   => $key,
    ]);

    $row = $stmt->fetch();

    successResponse([
        'key'   => $key,
        'value' => $row ? $row['pref_value'] : null,
        'found' => $row !== false,
    ], 'Preference retrieved');

} catch (Throwable $e) {
    dbErrorResponse($e, 'preferences/get.php', ['owner' => $owner, 'key' => $key]);
}