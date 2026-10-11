<?php
/**
 * API Helper Functions
 *
 * Common utilities for all API endpoints.
 */

require_once __DIR__ . '/config_loader.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/db_helper.php';

// ─── Response Helpers ─────────────────────────────────────────────────────
// All endpoints ultimately return via the standard Response class.
// These legacy helpers are retained as thin aliases so existing endpoints
// automatically conform to the Response::ok()/Response::error() architecture.

function jsonResponse(mixed $data, int $statusCode = 200): void {
    if (is_array($data) && isset($data['success'])) {
        if ($data['success']) {
            Response::ok($data['data'] ?? null, $data['message'] ?? 'Success', $statusCode ?: 200);
        }
        Response::error($data['message'] ?? 'Error', $statusCode ?: 400, $data['errors'] ?? null);
    }
    Response::sendJson($data, $statusCode);
}

function successResponse(mixed $data = null, string $message = 'Success'): void {
    Response::ok($data, $message, 200);
}

function errorResponse(string $message, int $statusCode = 400, mixed $errors = null): void {
    Response::error($message, $statusCode, $errors);
}

// ─── Request Helpers ──────────────────────────────────────────────────────

function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        errorResponse('Invalid JSON input', 400);
    }
    return $data ?? [];
}

function getParam(string $key, mixed $default = null): mixed {
    // Check GET, POST, then JSON body
    if (isset($_GET[$key])) return $_GET[$key];
    if (isset($_POST[$key])) return $_POST[$key];

    static $jsonInput = null;
    if ($jsonInput === null) {
        $jsonInput = getJsonInput();
    }
    return $jsonInput[$key] ?? $default;
}

function getMethod(): string {
    // For CLI (php -r, cron jobs), return 'CLI' so requireMethod() passes through
    return $_SERVER['REQUEST_METHOD'] ?? 'CLI';
}

function requireMethod(string ...$methods): void {
    $method = getMethod();
    // Allow CLI mode to pass through for cron jobs / maintenance scripts
    if ($method === 'CLI') return;
    if (!in_array($method, $methods)) {
        errorResponse('Method not allowed. Allowed: ' . implode(', ', $methods), 405);
    }
}

// ─── Rate Limiting ─────────────────────────────────────────────────────────

function checkRateLimit(string $identifier = '', int $maxAttempts = 100, int $windowSeconds = 60): void {
    if (empty($identifier)) {
        $identifier = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    // Use provided limits or fall back to configuration defaults
    if ($maxAttempts <= 0) $maxAttempts = RATE_LIMIT_MAX;
    if ($windowSeconds <= 0) $windowSeconds = RATE_LIMIT_WINDOW;

    $rateLimitDir = __DIR__ . '/../../server-data/ratelimit';
    if (!is_dir($rateLimitDir)) {
        @mkdir($rateLimitDir, 0755, true);
    }

    $file = $rateLimitDir . '/' . md5($identifier) . '.json';

    $data = ['count' => 0, 'reset' => time() + $windowSeconds];
    if (file_exists($file)) {
        $existing = json_decode((string) @file_get_contents($file), true);
        if ($existing && isset($existing['reset'])) {
            if (time() < $existing['reset']) {
                $data = $existing;
            }
        }
    }

    $data['count']++;

    if ($data['count'] > $maxAttempts) {
        $retryAfter = max(1, (int) $data['reset'] - time());
        header('Retry-After: ' . $retryAfter);
        errorResponse('Rate limit exceeded. Try again later.', 429, [
            'retry_after' => $retryAfter,
            'limit' => $maxAttempts,
            'window' => $windowSeconds,
        ]);
    }

    // Persist the counter so the window actually limits repeated requests.
    @file_put_contents($file, json_encode($data), LOCK_EX);
}

// ─── Auth / Database Error Logging ──────────────────────────────────────────

/**
 * Structured, server-side logging for authentication/persistence events.
 *
 * Writes a single-line entry to the configured PHP error log so failures are
 * diagnosable from cPanel. Credentials, password hashes and tokens must never
 * be passed in $context.
 */
function authError(string $event, string $message, array $context = []): void {
    $suffix = '';
    if (!empty($context)) {
        $encoded = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $suffix = ' | ' . ($encoded === false ? '{}' : $encoded);
    }

    error_log(sprintf(
        '[auth:%s] %s%s | ip=%s',
        $event,
        $message,
        $suffix,
        $_SERVER['REMOTE_ADDR'] ?? 'cli'
    ));
}

/**
 * Log a non-fatal auth notice.
 */
function authErrorNotice(string $event, string $message, array $context = []): void {
    authError($event, $message, $context);
}

/**
 * Stable per-request identifier used to correlate logs with responses.
 */
function getRequestId(): string {
    static $requestId = null;

    if ($requestId === null) {
        $requestId = $_SERVER['HTTP_X_REQUEST_ID'] ?? bin2hex(random_bytes(8));
    }

    return (string) $requestId;
}

/**
 * Translate a PDO/MySQL error into a safe client-facing message.
 *
 * Never returns raw SQL, DSN, credentials or driver text to the browser.
 */
function authDbMessage(Throwable $error): string {
    $sqlState = method_exists($error, 'errorInfo') && isset($error->errorInfo[0])
        ? (string) $error->errorInfo[0]
        : '';

    return match ($sqlState) {
        '23000' => 'A database constraint was violated. Please check the submitted details.',
        '42S02' => 'The registration table is missing or not migrated in MySQL.',
        '42000' => 'The database schema does not match the expected structure.',
        '28000' => 'Database authentication failed. Check the configured DB credentials.',
        default  => 'A database error occurred while processing your request.',
    };
}

/**
 * Translate a Throwable into a client-safe HTTP/JSON error.
 *
 * Logs the real driver message server-side and returns a meaningful status:
 *  - 1045/1044/1049/2002 -> 503 database unavailable (config/connection)
 *  - 1146 (table missing)   -> 500 incomplete schema
 *  - 1062 (duplicate)       -> 409 conflict
 *  - anything else          -> 500 database error
 */
function dbErrorResponse(Throwable $e, string $endpoint, array $context = []): void {
    $driverCode = 0;
    if ($e instanceof PDOException) {
        $driverCode = (int) ($e->errorInfo[1] ?? 0);
    }

    authError('db', $endpoint . ': ' . $e->getMessage(), $context + [
        'driver_code' => $driverCode,
        'sql_state'   => $e instanceof PDOException ? ($e->errorInfo[0] ?? null) : null,
        'request_id'  => getRequestId(),
    ]);

    switch ($driverCode) {
        case 1045:
        case 1044:
        case 1049:
        case 2002:
        case 2003:
            errorResponse('Database is not configured or unreachable. Please contact the administrator.', 503);
            break;

        case 1146:
            errorResponse('Database schema is incomplete. A required table is missing. Please contact the administrator.', 500);
            break;

        case 1062:
            errorResponse('This record already exists.', 409);
            break;

        default:
            errorResponse(authDbMessage($e), 500);
    }

    exit;
}

/**
 * Assert that a write statement actually changed a row.
 *
 * Guards against "returned success but nothing was persisted" failures.
 */
function assertRowsAffected(PDOStatement $stmt, string $endpoint, string $operation): void {
    $affected = $stmt->rowCount();

    if ($affected < 1) {
        authError('db', "{$operation} affected 0 rows", [
            'endpoint'    => $endpoint,
            'affected_rows' => $affected,
            'request_id'  => getRequestId(),
        ]);

        errorResponse(
            "The {$operation} did not modify any record in the database. No changes were saved.",
            500
        );
    }
}

// ─── Auth Schema Guard ──────────────────────────────────────────────────────

/**
 * Ensure the `users` table has every column the auth flow writes to.
 *
 * The PHP code is the source of truth for which columns must exist. If a
 * restored/older database is missing one, registration would fail with a
 * cryptic SQL error; this self-heals instead.
 *
 * Uses information_schema to check before ALTERing so it is safe on both
 * MySQL and MariaDB, and safe to call on every request.
 *
 * @return array{ok:bool,added:string[],missing:string[],error:?string}
 */
function ensureUsersSchema(PDO $db): array
{
    $required = [
        'designation'          => 'VARCHAR(10) DEFAULT NULL',
        'degree'               => 'VARCHAR(255) DEFAULT NULL',
        'hospital_name'        => 'VARCHAR(255) DEFAULT NULL',
        'registration_status'  => "ENUM('approved','pending','rejected') NOT NULL DEFAULT 'approved'",
        'approved_by'          => 'BIGINT UNSIGNED DEFAULT NULL',
        'approved_at'          => 'TIMESTAMP NULL DEFAULT NULL',
    ];

    $result = ['ok' => true, 'added' => [], 'missing' => [], 'error' => null];

    try {
        $dbName = (string) $db->query('SELECT DATABASE()')->fetchColumn();
        if ($dbName === '') {
            $result['ok'] = false;
            $result['error'] = 'No database selected';
            return $result;
        }

        $check = $db->prepare(
            'SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = \'users\' AND COLUMN_NAME IN ('
            . implode(',', array_fill(0, count($required), '?')) . ')'
        );
        $check->execute(array_merge([$dbName], array_keys($required)));

        $present = array_map('strval', $check->fetchAll(PDO::FETCH_COLUMN) ?: []);
        $absent = array_diff(array_keys($required), $present);

        if (empty($absent)) {
            return $result;
        }

        foreach ($absent as $column) {
            $safeColumn = str_replace('`', '``', $column);
            $db->exec("ALTER TABLE `users` ADD COLUMN `{$safeColumn}` " . $required[$column]);
            $result['added'][] = $column;
            authErrorNotice('ensureUsersSchema', 'Added missing users column: ' . $column);
        }
    } catch (Throwable $e) {
        $result['ok'] = false;
        $result['error'] = $e->getMessage();
        authError('ensureUsersSchema', $e->getMessage());
    }

    return $result;
}

/**
 * Roles accepted by the staff registration and approval flow.
 * Single source of truth so register.php and approve.php cannot drift apart.
 */
function staffRoles(): array {
    return [
        'admin', 'consultant_doctor', 'medical_officer', 'intern_doctor',
        'nurse', 'staff', 'reception', 'doctor',
        'assistant_registrar', 'registrar',
        'assistant_professor', 'associate_professor', 'professor',
    ];
}

// ─── Input Validation ──────────────────────────────────────────────────────

function validateRequired(array $data, array $fields): ?array {
    $missing = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missing[] = $field;
        }
    }
    return empty($missing) ? null : $missing;
}

function sanitizeString(string $value): string {
    $value = strip_tags($value);
    $value = trim($value);
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function sanitizeEmail(string $email): string {
    $email = filter_var($email, FILTER_SANITIZE_EMAIL);
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? strtolower($email) : '';
}

function sanitizePhone(string $phone): string {
    // Allow digits, +, -, (, ), and spaces
    return preg_replace('/[^0-9+\-\(\) ]/', '', trim($phone));
}

// ─── Password Validation ───────────────────────────────────────────────────

function validatePasswordStrength(string $password): ?string {
    if (strlen($password) < 8) {
        return 'Password must be at least 8 characters long';
    }
    if (!preg_match('/[A-Z]/', $password)) {
        return 'Password must contain at least one uppercase letter';
    }
    if (!preg_match('/[a-z]/', $password)) {
        return 'Password must contain at least one lowercase letter';
    }
    if (!preg_match('/[0-9]/', $password)) {
        return 'Password must contain at least one number';
    }
    if (!preg_match('/[!@#$%^&*()_\-+={}[\]|:;"\'<>,.?\/~`]/', $password)) {
        return 'Password must contain at least one special character';
    }
    return null; // Password is strong
}

// ─── Pagination ────────────────────────────────────────────────────────────

function getPaginationParams(): array {
    $page = max(1, (int) getParam('page', 1));
    $limit = min(100, max(1, (int) getParam('limit', 20)));
    $offset = ($page - 1) * $limit;

    return [
        'page' => $page,
        'limit' => $limit,
        'offset' => $offset,
    ];
}

function paginatedResponse(array $items, int $total, int $page, int $limit): void {
    $totalPages = ceil($total / $limit);

    successResponse([
        'items' => $items,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'total_pages' => $totalPages,
            'has_more' => $page < $totalPages,
        ],
    ]);
}

// ─── File Upload Helpers ───────────────────────────────────────────────────

function handleFileUpload(string $fieldName, string $subDir = ''): ?string {
    if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] !== UPLOAD_ERR_OK) {
        return null;
    }

    $file = $_FILES[$fieldName];

    // Validate file size
    if ($file['size'] > MAX_UPLOAD_SIZE) {
        errorResponse('File too large. Maximum: ' . (MAX_UPLOAD_SIZE / 1024 / 1024) . 'MB', 413);
    }

    // Validate extension
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXTENSIONS)) {
        errorResponse('File type not allowed. Allowed: ' . implode(', ', ALLOWED_EXTENSIONS), 415);
    }

    // Validate MIME type
    $allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    if (!in_array($mimeType, $allowedMimes)) {
        errorResponse('Invalid file type (MIME: ' . $mimeType . ')', 415);
    }

    // Create upload directory
    $uploadDir = UPLOAD_DIR . '/' . ($subDir ? $subDir . '/' : '');
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }

    // Generate unique filename
    $filename = uniqid() . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
    $filepath = $uploadDir . $filename;

    // Copy rather than move: move_uploaded_file() only succeeds for real uploads,
    // which silently broke persistence when move_uploaded_file() returned false.
    if (!@move_uploaded_file($file['tmp_name'], $filepath)
        && !@copy($file['tmp_name'], $filepath)) {
        errorResponse('Failed to save uploaded file', 500);
    }

    return UPLOAD_URL . '/' . ($subDir ? $subDir . '/' : '') . $filename;
}

// ─── Logging ───────────────────────────────────────────────────────────────

function logAudit(
    int|null $userId,
    int|null $patientId,
    string $action,
    string $entityType,
    int|null $entityId = null,
    mixed $oldValues = null,
    mixed $newValues = null
): void {
    try {
        $db = Database::getInstance();
        // Use null for unauthenticated actions — FK is ON DELETE SET NULL
        // Verify user_id exists in users table to prevent FK violations
        $safeUserId = null;
        if ($userId !== null && $userId > 0) {
            $checkStmt = $db->prepare('SELECT 1 FROM users WHERE id = ?');
            $checkStmt->execute([$userId]);
            if ($checkStmt->fetchColumn()) {
                $safeUserId = $userId;
            }
        }
        // Verify patient_id exists in patients table if provided
        $safePatientId = null;
        if ($patientId !== null && $patientId > 0) {
            $checkStmt = $db->prepare('SELECT 1 FROM patients WHERE id = ?');
            $checkStmt->execute([$patientId]);
            if ($checkStmt->fetchColumn()) {
                $safePatientId = $patientId;
            }
        }
        $stmt = $db->prepare('
            INSERT INTO audit_logs (user_id, patient_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
            VALUES (:user_id, :patient_id, :action, :entity_type, :entity_id, :old_values, :new_values, :ip_address, :user_agent)
        ');
        $stmt->execute([
            ':user_id' => $safeUserId,
            ':patient_id' => $safePatientId,
            ':action' => $action,
            ':entity_type' => $entityType,
            ':entity_id' => $entityId,
            ':old_values' => $oldValues ? json_encode($oldValues) : null,
            ':new_values' => $newValues ? json_encode($newValues) : null,
            ':ip_address' => $_SERVER['REMOTE_ADDR'] ?? ($_SERVER['SERVER_ADDR'] ?? '127.0.0.1'),
            ':user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'CLI',
        ]);
    } catch (\Throwable $e) {
        error_log('Audit log failed: ' . $e->getMessage());
    }
}

// ─── Session Helpers ───────────────────────────────────────────────────────

/**
 * Whether the current request arrived over HTTPS (directly or via proxy).
 */
function isSecureCookieRequest(): bool {
    if (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off') {
        return true;
    }

    if (($_SERVER['SERVER_PORT'] ?? null) === 443) {
        return true;
    }

    $forwardedProto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '';
    return strtolower((string) $forwardedProto) === 'https';
}

/**
 * Start the PHP session used for CSRF tokens and session fixation defence.
 * Returns the active session id, or an empty string when sessions are disabled.
 */
function startAuthSession(): string {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return (string) session_id();
    }

    if (PHP_SAPI === 'cli' || session_status() === PHP_SESSION_DISABLED) {
        return '';
    }

    if (headers_sent()) {
        authError('session', 'Cannot start PHP session: headers already sent');
        return '';
    }

    session_set_cookie_params([
        'lifetime' => SESSION_LIFETIME,
        'path' => '/',
        'secure' => isSecureCookieRequest(),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    if (!session_start()) {
        authError('session', 'session_start() returned false', [
            'status' => session_status(),
        ]);
        return '';
    }

    return (string) session_id();
}

// ─── CORS & Pre-flight ─────────────────────────────────────────────────────

function handleCors(): void {
    // CORS is handled in .htaccess, but ensure pre-flight works
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}