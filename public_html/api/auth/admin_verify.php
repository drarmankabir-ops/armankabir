<?php
/**
 * GET /api/auth/admin_verify.php
 *
 * Restore the authenticated portal content-admin account.
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/middleware.php';

handleCors();
requireMethod('GET');

$admin = requireAuth();
if (($admin['session_type'] ?? '') !== 'admin_content') {
    errorResponse('Portal admin session required.', 403);
}

successResponse([
    'admin' => [
        'id' => (int) $admin['id'],
        'username' => $admin['username'],
        'display_name' => $admin['display_name'],
    ],
], 'Admin session valid');