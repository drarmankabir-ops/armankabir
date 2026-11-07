<?php
/**
 * POST /api/frontpage/save.php
 *
 * Admin-only, partial updates to public landing-page content. Unchanged
 * sections and doctor overrides are preserved in site_settings.
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth/middleware.php';
require_once __DIR__ . '/storage.php';

handleCors();
requireMethod('POST');

$user = requirePermission('manage_homepage_content');
requireCsrfToken();

$input = getJsonInput();
if ($input === [] || frontPageIsList($input)) {
    errorResponse('A JSON object with content to save is required.', 400);
}

foreach (['siteConfig', 'doctorContentOverrides'] as $field) {
    if (array_key_exists($field, $input)
        && (!is_array($input[$field])
            || ($input[$field] !== [] && frontPageIsList($input[$field])))) {
        errorResponse($field . ' must be a JSON object.', 422);
    }
    if (isset($input['siteConfig']['doctorContentOverrides'])
        && (!is_array($input['siteConfig']['doctorContentOverrides'])
            || ($input['siteConfig']['doctorContentOverrides'] !== []
                && frontPageIsList($input['siteConfig']['doctorContentOverrides'])))) {
        errorResponse('doctorContentOverrides must be a JSON object.', 422);
    }
}

try {
    $db = Database::getInstance();
    $lockAcquired = (int) $db->query("SELECT GET_LOCK('arman_frontpage_write', 10)")->fetchColumn();
    if ($lockAcquired !== 1) {
        errorResponse('Front-page content is busy. Please retry the save.', 503);
    }
    $db->beginTransaction();

    $content = loadFrontPageContent($db);
    $siteConfig = $content['siteConfig'];
    $doctorOverrides = $content['doctorContentOverrides'];
    $hasSitePatch = array_key_exists('siteConfig', $input);
    $hasDoctorPatch = array_key_exists('doctorContentOverrides', $input);

    if ($hasSitePatch) {
        $sitePatch = $input['siteConfig'];
    } elseif (!$hasDoctorPatch) {
        // Accept a direct section patch for compatibility with older clients.
        $sitePatch = $input;
        unset($sitePatch['updated_at']);
    } else {
        $sitePatch = [];
    }

    if (array_key_exists('doctorContentOverrides', $sitePatch)) {
        $nestedOverrides = $sitePatch['doctorContentOverrides'];
        if (!is_array($nestedOverrides)) {
            errorResponse('doctorContentOverrides must be a JSON object.', 422);
        }
        $doctorOverrides = mergeFrontPageContent($doctorOverrides, $nestedOverrides);
        unset($sitePatch['doctorContentOverrides']);
        $hasDoctorPatch = true;
    }

    if ($hasSitePatch || (!$hasDoctorPatch && $sitePatch !== [])) {
        $siteConfig = mergeFrontPageContent($siteConfig, $sitePatch);
        if (!is_array($siteConfig)) {
            errorResponse('siteConfig must be a JSON object.', 422);
        }
    }

    if (array_key_exists('doctorContentOverrides', $input)) {
        $doctorOverrides = mergeFrontPageContent(
            $doctorOverrides,
            $input['doctorContentOverrides']
        );
    }

    $userId = ($user['session_type'] ?? 'user') === 'user'
        ? (int) $user['id']
        : null;
    saveFrontPageSetting($db, 'siteConfig', $siteConfig, $userId);
    if ($hasDoctorPatch) {
        saveFrontPageSetting($db, 'doctorContentOverrides', $doctorOverrides, $userId);
    }

    if ($userId !== null) {
        logAudit($userId, null, 'update', 'frontpage', null, null, [
            'keys_saved' => array_values(array_filter(
                array_keys($input),
                static fn (string $key): bool => $key !== 'updated_at'
            )),
        ]);
    }

    $db->commit();
    $db->query("SELECT RELEASE_LOCK('arman_frontpage_write')");
    successResponse([
        'siteConfig' => $siteConfig ?: new stdClass(),
        'doctorContentOverrides' => $doctorOverrides ?: new stdClass(),
        'updated_at' => date('Y-m-d H:i:s'),
    ], 'Front page content saved successfully');
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    if (isset($db) && ($lockAcquired ?? 0) === 1) {
        try {
            $db->query("SELECT RELEASE_LOCK('arman_frontpage_write')");
        } catch (Throwable $releaseError) {
            error_log('Front page save lock release error: ' . $releaseError->getMessage());
        }
    }
    error_log('Front page save error: ' . $e->getMessage());
    errorResponse('Failed to save front page content.', 500);
}
