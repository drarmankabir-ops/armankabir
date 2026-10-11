<?php
/**
 * Database setup wizard — DISABLED
 *
 * Disabled after a security review. The wizard posted database credentials to
 * /api/setup-test.php, which has also been disabled.
 *
 * This page publicly displayed the seeded default account credentials, so it is
 * no longer served.
 *
 * To re-provision a database, contact your host and run the migration SQL in
 * server-data/migrations over SSH/cPanel phpMyAdmin.
 */

http_response_code(410);
header('Content-Type: text/plain; charset=utf-8');

echo "Setup wizard disabled.\n";
exit;