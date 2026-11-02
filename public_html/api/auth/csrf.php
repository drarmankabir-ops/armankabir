<?php
/**
 * GET /api/auth/csrf.php
 *
 * Returns a synchronizer token for same-origin state-changing API requests.
 */

require_once __DIR__ . '/middleware.php';

handleCors();
requireMethod('GET');

successResponse(['token' => getCsrfToken()], 'CSRF token retrieved');
