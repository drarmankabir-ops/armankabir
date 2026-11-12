<?php
/**
 * Keep PHP diagnostics in the server error log, never in API responses.
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');

register_shutdown_function(static function (): void {
    $error = error_get_last();
    if ($error === null || !in_array($error['type'], [
        E_ERROR,
        E_PARSE,
        E_CORE_ERROR,
        E_COMPILE_ERROR,
        E_USER_ERROR,
        E_RECOVERABLE_ERROR,
    ], true)) {
        return;
    }

    if (ob_get_level() > 0) {
        ob_clean();
    }
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo '{"success":false,"message":"An internal server error occurred.","error_code":"internal_error"}';
});

$privateLogDirectory = dirname(__DIR__, 2) . '/logs';
if (is_dir($privateLogDirectory) && is_writable($privateLogDirectory)) {
    ini_set('error_log', $privateLogDirectory . '/php-error.log');
}

ob_start(static function (string $output): string {
    $trimmedOutput = trim($output);
    if ($trimmedOutput === '') {
        return '';
    }

    $decodedOutput = json_decode($trimmedOutput, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($decodedOutput)) {
        return $output;
    }

    error_log('Non-JSON output suppressed for API response.');
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    return '{"success":false,"message":"An internal server error occurred.","error_code":"internal_error"}';
});
