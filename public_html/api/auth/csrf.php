<?php
/**
 * GET /api/auth/csrf.php
 *
 * Returns a synchronizer token for same-origin state-changing API requests.
 */

require_once __DIR__ . '/middleware.php';

handleCors();
requireMethod('GET');

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
successResponse(['token' => getCsrfToken()], 'CSRF token retrieved');
