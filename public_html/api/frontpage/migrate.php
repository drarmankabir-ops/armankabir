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

$user = requirePermission('manage_homepage_content');
requireCsrfToken();

try {
    $db = Database::getInstance();
    $lockAcquired = (int) $db->query("SELECT GET_LOCK('arman_frontpage_write', 10)")->fetchColumn();
    if ($lockAcquired !== 1) {
        errorResponse('Front-page content is busy. Please retry the migration.', 503);
    }
    $content = migrateLegacyFrontPageContent(
        $db,
        $user,
        loadFrontPageContent($db)
    );
    $db->query("SELECT RELEASE_LOCK('arman_frontpage_write')");
    successResponse($content, 'Legacy front-page content migration complete');
} catch (Throwable $e) {
    if (isset($db) && ($lockAcquired ?? 0) === 1) {
        try {
            $db->query("SELECT RELEASE_LOCK('arman_frontpage_write')");
        } catch (Throwable $releaseError) {
            error_log('Front-page migration lock release error: ' . $releaseError->getMessage());
        }
    }
    error_log('Front-page migration error: ' . $e->getMessage());
    errorResponse('Failed to migrate legacy front-page content.', 500);
}