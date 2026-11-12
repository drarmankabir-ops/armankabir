<?php
/**
 * Admin Content Login API
 * 
 * POST /api/auth/admin_login.php
 * Body: { "username": "...", "password": "..." }
 * 
 * Replaces the hardcoded ADMIN_ACCOUNTS in the frontend JS.
 * Returns account details only. Authentication uses a server-side session and
 * an HttpOnly cookie; session tokens are never exposed to frontend JavaScript.
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/middleware.php';

handleCors();
requireMethod('POST');
requireCsrfToken();
checkRateLimit('admin_login_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 10, 900); // 10 attempts per 15 min

$input = getJsonInput();

$missing = validateRequired($input, ['username', 'password']);
if ($missing) {
    errorResponse('Missing required fields', 400, [
        'missing_fields' => $missing,
    ]);
}
if (!is_string($input['username']) || !is_string($input['password'])) {
    errorResponse('Username and password must be strings.', 400);
}

$username = trim($input['username']);
$password = $input['password'];
if ($username === '' || $password === '') {
    errorResponse('Username and password are required.', 400);
}

try {
    $db = Database::getInstance();
    
    // Find admin account
    $stmt = $db->prepare(
        'SELECT id, username, password_hash, display_name
         FROM admin_accounts
         WHERE username = :username AND is_active = 1
         LIMIT 1'
    );
    $stmt->execute([':username' => $username]);
    $admin = $stmt->fetch();
    
    if (!$admin) {
        logAudit(null, null, 'failed_admin_login', 'admin', null, null, ['username' => $username, 'reason' => 'not_found']);
        errorResponse('Invalid username or password', 401);
    }
    
    // Verify password (use timing-safe hash verification)
    if (!password_verify($password, $admin['password_hash'])) {
        logAudit(null, null, 'failed_admin_login', 'admin', $admin['id'], null, ['reason' => 'invalid_password']);
        errorResponse('Invalid username or password', 401);
    }

    if (session_status() !== PHP_SESSION_ACTIVE || !session_regenerate_id(true)) {
        error_log('Admin login could not regenerate the PHP session ID.');
        errorResponse('Unable to establish a secure login session.', 500);
    }
    
    // Check if password needs rehash (if algorithm/cost changed)
    if (password_needs_rehash($admin['password_hash'], PASSWORD_DEFAULT)) {
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        $updateStmt = $db->prepare('UPDATE admin_accounts SET password_hash = :hash WHERE id = :id');
        $updateStmt->execute([':hash' => $newHash, ':id' => $admin['id']]);
    }
    
    // Update last login
    $updateStmt = $db->prepare('UPDATE admin_accounts SET last_login_at = NOW() WHERE id = :id');
    $updateStmt->execute([':id' => $admin['id']]);
    
    // Create server-side session (stored in admin_sessions for verification)
    $token = createAdminSession($admin['id']);

    if (!setcookie('session_token', $token, [
        'expires' => time() + SESSION_LIFETIME,
        'path' => '/',
        'secure' => isSecureCookieRequest(),
        'httponly' => true,
        'samesite' => 'Lax',
    ])) {
        error_log('Admin login could not set the session cookie.');
        errorResponse('Unable to establish a secure login session.', 500);
    }
    
    // Log audit
    logAudit(null, null, 'admin_login', 'admin', $admin['id']);
    
    successResponse([
        'admin' => [
            'id' => (int)$admin['id'],
            'username' => $admin['username'],
            'display_name' => $admin['display_name'],
        ],
        'is_admin' => true,
    ], 'Login successful');
    
} catch (\Throwable $e) {
    error_log('Admin login error: ' . $e->getMessage());
    errorResponse('Login failed. Please try again.', 500);
}
