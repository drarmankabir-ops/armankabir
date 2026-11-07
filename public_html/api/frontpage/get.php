<?php
/**
 * GET /api/frontpage/get.php
 *
 * Publicly readable landing-page content stored in site_settings.
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/storage.php';

handleCors();
requireMethod('GET');

$key = getParam('key', 'all');
if (!is_string($key) || !preg_match('/^[a-zA-Z0-9_-]+$/', $key)) {
    errorResponse('Invalid key format.', 400);
}

try {
    $db = Database::getInstance();
    $content = loadFrontPageContent($db);

    if ($key === 'defaults') {
        successResponse(defaultFrontPageConfig());
    }
    if ($key === 'siteConfig') {
        successResponse($content['siteConfig'] ?: new stdClass());
    }
    if ($key === 'doctorContentOverrides') {
        successResponse($content['doctorContentOverrides'] ?: new stdClass());
    }
    if ($key === 'all') {
        successResponse([
            'siteConfig' => $content['siteConfig'] ?: new stdClass(),
            'doctorContentOverrides' => $content['doctorContentOverrides'] ?: new stdClass(),
        ]);
    }

    if (array_key_exists($key, $content['siteConfig'])) {
        successResponse($content['siteConfig'][$key]);
    }

    errorResponse('Unknown public content key.', 400);
} catch (Throwable $e) {
    error_log('Front page get error: ' . $e->getMessage());
    errorResponse('Failed to fetch front page content.', 500);
}
