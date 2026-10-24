<?php
/**
 * GET /api/preferences/list.php
 *
 * Returns all preferences for the authenticated principal as a key/value map.
 */

require_once __DIR__ . '/bootstrap.php';

handleCors();
requireMethod('GET');

$user = requireAuth();
$owners = preferenceOwners($user);

try {
    $db = preferencesDb();

    $principalOwner = preferenceOwner($user);
    if (($user['session_type'] ?? 'user') === 'user') {
        $legacyStmt = $db->prepare(
            'SELECT pref_key, pref_value FROM user_preferences
             WHERE owner_key = :owner'
        );
        $legacyStmt->execute([':owner' => $principalOwner]);
        $promoteStmt = $db->prepare(
            'INSERT IGNORE INTO user_preferences (owner_key, pref_key, pref_value)
             VALUES (:owner, :key, :value)'
        );
        foreach ($legacyStmt->fetchAll() as $legacyRow) {
            if (isPersonalPreferenceKey((string) $legacyRow['pref_key'])) {
                continue;
            }
            $promoteStmt->execute([
                ':owner' => 'clinic:1',
                ':key' => $legacyRow['pref_key'],
                ':value' => $legacyRow['pref_value'],
            ]);
        }
    }

    $stmt = $db->prepare(
        'SELECT owner_key, pref_key, pref_value FROM user_preferences
         WHERE owner_key IN (:clinic_owner, :principal_owner)
         ORDER BY pref_key'
    );
    $stmt->execute([
        ':clinic_owner' => $owners[0],
        ':principal_owner' => $owners[count($owners) - 1],
    ]);

    $preferences = [];
    foreach ($stmt->fetchAll() as $row) {
        $key = (string) $row['pref_key'];
        if ($row['owner_key'] === preferenceOwner($user, $key)) {
            $preferences[$key] = $row['pref_value'];
        }
    }

    successResponse($preferences, 'Preferences retrieved');
} catch (Throwable $e) {
    dbErrorResponse($e, 'preferences/list.php', ['owners' => $owners]);
}
