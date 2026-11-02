<?php
/**
 * POST /api/frontpage/migrate.php
 *
 * One-time, admin-only migration of legacy front-page preferences.
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth/middleware.php';
require_once __DIR__ . '/storage.php';

handleCors();
requireMethod('POST');

$user = requireRole(['admin', 'admin_content']);
requireCsrfToken();

try {
    $db = Database::getInstance();
    $content = migrateLegacyFrontPageContent(
        $db,
        $user,
        loadFrontPageContent($db)
    );
    successResponse($content, 'Legacy front-page content migration complete');
} catch (Throwable $e) {
    error_log('Front-page migration error: ' . $e->getMessage());
    errorResponse('Failed to migrate legacy front-page content.', 500);
}