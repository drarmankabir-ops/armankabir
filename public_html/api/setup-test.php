<?php
/**
 * Database Setup API Handler — DISABLED
 *
 * This endpoint has been permanently disabled after a security review.
 *
 * It originally accepted unauthenticated POST requests carrying database host /
 * user / password / dbname and exposed three destructive actions:
 *   - test     : connect to and enumerate an arbitrary MySQL server
 *   - migrate  : CREATE DATABASE / run schema / seed, with `fresh` performing
 *                DROP DATABASE
 *   - saveenv  : write attacker-supplied credentials into public_html/config.php
 *
 * It also sent `Access-Control-Allow-Origin: *` and was implemented in PHP, so
 * no .htaccess FilesMatch rule could block it.
 *
 * The database is already provisioned. Re-provisioning must be performed by a
 * server administrator over SSH/cPanel, never through a public web endpoint.
 *
 * This stub returns 410 Gone and reveals nothing about the server.
 */

http_response_code(410);
header('Content-Type: application/json');
header('Cache-Control: no-store');

echo json_encode([
    'success' => false,
    'message' => 'Setup endpoint disabled.',
]);

exit;