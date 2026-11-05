<?php
/**
 * Logout API
 * 
 * POST /api/auth/logout.php
 * Headers: Authorization: Bearer <token>
 * 
 * Invalidates the current session.
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/middleware.php';

handleCors();
requireMethod('POST');
requireCsrfToken();

$user = getAuthUser();

try {
    $token = getBearerToken();
    if ($token !== null) {
        destroySession($token);
    } elseif (isset($_COOKIE['session_token'])) {
        setcookie('session_token', '', [
            'expires' => 1,
            'path' => '/',
            'domain' => '',
            'secure' => isSecureCookieRequest(),
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        unset($_COOKIE['session_token']);
    }
    
    if ($user && ($user['session_type'] ?? 'user') === 'admin_content') {
        logAudit(null, null, 'logout', 'admin', $user['id']);
    } elseif ($user) {
        logAudit($user['id'], null, 'logout', 'user', $user['id']);
    }
    
    successResponse(null, 'Logged out successfully');
} catch (\Exception $e) {
    error_log('Logout error: ' . $e->getMessage());
    errorResponse('Logout failed', 500);
}
