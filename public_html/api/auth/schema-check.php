<?php
/**
 * Auth Schema Diagnostic — PERMANENTLY DISABLED
 *
 * GET|POST /api/auth/schema-check.php  ->  410 Gone
 *
 * This endpoint was a temporary read-only diagnostic used during the PHP/MySQL
 * authentication migration to confirm that the tables and columns required by
 * the auth flow existed.
 *
 * WHY IT IS NOW DISABLED
 * ----------------------
 * Even though it only returned table/column names and row counts, it published
 * the internal database schema to anonymous visitors. That is unnecessary
 * reconnaissance for anyone probing the authentication surface, so the endpoint
 * has been permanently removed rather than left available.
 *
 * It is retained as a 410 Gone stub so that:
 *   - the URL cannot be re-enabled by accident,
 *   - scanners see an explicit, non-200 answer instead of a live schema dump,
 *   - a copy of the diagnostic logic is still in version history.
 *
 * The application never calls this endpoint; nothing else depends on it.
 */

http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
header('Allow: GET, POST');
header('Cache-Control: no-store, no-cache, must-revalidate');

echo json_encode([
    'success' => false,
    'message' => 'This diagnostic endpoint has been permanently disabled.',
    'error_code' => 'gone',
    'timestamp' => date(DATE_ATOM),
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

exit;