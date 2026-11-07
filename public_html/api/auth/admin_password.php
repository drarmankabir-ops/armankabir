<?php
/** Change the authenticated administrator's password and rotate their session. */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/middleware.php';

handleCors();
requireMethod('POST');
$user = requireAuth();
requireCsrfToken();

$sessionType = $user['session_type'] ?? 'user';
if ($sessionType !== 'admin_content' && !($sessionType === 'user' && ($user['role'] ?? '') === 'admin')) {
    errorResponse('Administrator access is required.', 403);
}

$input = getJsonInput();
$missing = validateRequired($input, ['current_password', 'new_password']);
if ($missing) {
    errorResponse('Missing required fields.', 400, ['missing_fields' => $missing]);
}

$currentPassword = (string) $input['current_password'];
$newPassword = (string) $input['new_password'];
if (strlen($newPassword) < 12 || strlen($newPassword) > 128) {
    errorResponse('New password must be between 12 and 128 characters.', 400);
}
$passwordError = validatePasswordStrength($newPassword);
if ($passwordError) {
    errorResponse($passwordError, 400);
}

$token = getBearerToken();
if ($token === null) {
    errorResponse('Authentication required. Please log in again.', 401);
}

try {
    $db = Database::getInstance();
    $table = $sessionType === 'admin_content' ? 'admin_accounts' : 'users';
    $sessionTable = $sessionType === 'admin_content' ? 'admin_sessions' : 'user_sessions';
    $accountId = (int) $user['id'];
    $find = $db->prepare("SELECT password_hash FROM {$table} WHERE id = :id LIMIT 1");
    $find->execute([':id' => $accountId]);
    $account = $find->fetch();
    if (!$account || !password_verify($currentPassword, $account['password_hash'])) {
        errorResponse('Current password is incorrect.', 401);
    }

    $newToken = bin2hex(random_bytes(64));
    $expiresAt = date('Y-m-d H:i:s', time() + SESSION_LIFETIME);
    $db->beginTransaction();

    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $update = $db->prepare("UPDATE {$table} SET password_hash = :password_hash WHERE id = :id");
    $update->execute([
        ':password_hash' => $passwordHash,
        ':id' => $accountId,
    ]);

    if ($sessionType === 'admin_content') {
        $linkedUser = $db->prepare("SELECT id FROM users WHERE email = :email AND role = 'admin' LIMIT 1");
        $linkedUser->execute([':email' => $user['username']]);
        $linkedUserId = $linkedUser->fetchColumn();
        if ($linkedUserId) {
            $db->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id')
                ->execute([':password_hash' => $passwordHash, ':id' => $linkedUserId]);
            $db->prepare('DELETE FROM user_sessions WHERE user_id = :id')->execute([':id' => $linkedUserId]);
        }
    } else {
        $linkedAdmin = $db->prepare('SELECT id FROM admin_accounts WHERE username = :username LIMIT 1');
        $linkedAdmin->execute([':username' => $user['email']]);
        $linkedAdminId = $linkedAdmin->fetchColumn();
        if ($linkedAdminId) {
            $db->prepare('UPDATE admin_accounts SET password_hash = :password_hash WHERE id = :id')
                ->execute([':password_hash' => $passwordHash, ':id' => $linkedAdminId]);
            $db->prepare('DELETE FROM admin_sessions WHERE admin_id = :id')->execute([':id' => $linkedAdminId]);
        }
    }

    $rotate = $db->prepare("UPDATE {$sessionTable} SET token = :new_token, expires_at = :expires_at WHERE token = :old_token AND " . ($sessionType === 'admin_content' ? 'admin_id' : 'user_id') . ' = :account_id');
    $rotate->execute([
        ':new_token' => $newToken,
        ':expires_at' => $expiresAt,
        ':old_token' => $token,
        ':account_id' => $accountId,
    ]);
    if ($rotate->rowCount() !== 1) {
        $db->rollBack();
        errorResponse('Session expired. Please log in again.', 401);
    }

    $revokeOthers = $db->prepare("DELETE FROM {$sessionTable} WHERE " . ($sessionType === 'admin_content' ? 'admin_id' : 'user_id') . ' = :account_id AND token <> :token');
    $revokeOthers->execute([':account_id' => $accountId, ':token' => $newToken]);
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_regenerate_id(true);
    }
    $db->commit();

    setcookie('session_token', $newToken, [
        'expires' => time() + SESSION_LIFETIME,
        'path' => '/',
        'secure' => isSecureCookieRequest(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    logAudit($sessionType === 'user' ? $accountId : null, null, 'admin_password_changed', 'admin', $accountId);
    successResponse(null, 'Administrator password changed successfully.');
} catch (Throwable $error) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('Admin password change error: ' . $error->getMessage());
    errorResponse('Could not change the administrator password.', 500);
}