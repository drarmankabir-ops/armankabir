<?php
/**
 * Site Configuration API
 * 
 * GET /api/settings/site-config.php     — Retrieve site config and doctor content overrides
 * POST /api/settings/site-config.php    — Update site config and/or doctor content overrides
 * 
 * This endpoint is used by the frontend landingService (useSiteConfig, useDoctorContent hooks).
 * 
 * Request body (POST, JSON):
 *   { "siteConfig": { ... }, "doctorContentOverrides": { ... } }
 * 
 * Response (GET):
 *   { "success": true, "data": { "heroSection": {...}, "aboutSection": {...}, ... } }
 * 
 * Response (POST):
 *   { "success": true, "data": { "siteConfig": {...}, "doctorContentOverrides": {...}, "updated_at": "..." }, "message": "..." }
 */

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    require __DIR__ . '/../frontpage/get.php';
}
require __DIR__ . '/../frontpage/save.php';

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth/middleware.php';

handleCors();

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance();

    if ($method === 'GET') {
        // ── GET: Retrieve site config ──────────────────────────────────────────
        
        $stmt = $db->prepare("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('siteConfig', 'doctorContentOverrides')");
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $siteConfig = null;
        $doctorContentOverrides = null;

        foreach ($rows as $row) {
            $decoded = json_decode($row['setting_value'], true);
            if ($row['setting_key'] === 'siteConfig') {
                $siteConfig = $decoded;
            } elseif ($row['setting_key'] === 'doctorContentOverrides') {
                $doctorContentOverrides = $decoded;
            }
        }

        // Merge doctorContentOverrides into siteConfig for backward compatibility
        if ($siteConfig && $doctorContentOverrides) {
            $siteConfig['doctorContentOverrides'] = $doctorContentOverrides;
        } elseif ($doctorContentOverrides) {
            $siteConfig = ['doctorContentOverrides' => $doctorContentOverrides];
        }

        // If nothing found, return a minimal default
        if (!$siteConfig) {
            $siteConfig = new stdClass();
        }

        successResponse($siteConfig);

    } elseif ($method === 'POST') {
        require __DIR__ . '/../frontpage/save.php';

    } else {
        errorResponse('Method not allowed', 405);
    }
} catch (\Exception $e) {
    error_log('Site config error: ' . $e->getMessage());
    errorResponse('Failed to process site configuration', 500);
}
