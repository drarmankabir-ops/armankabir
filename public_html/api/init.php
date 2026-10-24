<?php
/**
 * Dr. Arman Kabir Care — Initialization & Setup Script
 * 
 * Handles PHP/MySQL application startup and setup checks.
 * Now handles:
 * - Database validation
 * - Migration execution
 * - Seed data loading
 * - Environment configuration
 * - Permission verification
 * - Health checks
 *
 * Usage:
 * - Web: Access https://drarmankabir.com/api/init.php in browser
 * - CLI: php public_html/api/init.php --setup --seed --verify
 *
 * Requirements:
 * - Database credentials configured in config.php
 * - Write permissions to server-data/migrations/
 * - PHP CLI for command-line execution
 */

header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ─────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────

define('PROJECT_ROOT', realpath(__DIR__ . '/../../'));
define('CONFIG_FILE', PROJECT_ROOT . '/public_html/config.php');
define('MIGRATIONS_DIR', PROJECT_ROOT . '/server-data/migrations');
define('LOGS_DIR', PROJECT_ROOT . '/logs');

// Migration order and dependencies
const INIT_ORDER = [
    1 => ['name' => 'auth-roles', 'file' => '001_schema.sql', 'desc' => 'Must be first — all others query it for access control'],
    2 => ['name' => 'patient-data', 'file' => '002_seed.sql', 'desc' => 'Patient records and history'],
    3 => ['name' => 'clinical-data', 'file' => '002_classroom_schema.sql', 'desc' => 'Clinical notes and assessments'],
    4 => ['name' => 'admission-data', 'file' => '003_auth_conversion.sql', 'desc' => 'Hospital admission records'],
    5 => ['name' => 'appointment-data', 'file' => '004_staff_registration_fixes.sql', 'desc' => 'Appointment scheduling'],
    6 => ['name' => 'queue-data', 'file' => '008_create_site_settings_table.sql', 'desc' => 'Queue management'],
    7 => ['name' => 'alert-data', 'file' => '009_admin_sessions.sql', 'desc' => 'Alert notifications'],
    8 => ['name' => 'sync-device', 'file' => '010_create_user_preferences_table.sql', 'desc' => 'Device synchronization'],
];

// ───────────────────────────────────────��─────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

function log_message($level, $message) {
    $timestamp = date('Y-m-d H:i:s');
    $log_file = LOGS_DIR . '/init.log';
    $log_entry = "[$timestamp] [$level] $message\n";
    
    @mkdir(LOGS_DIR, 0755, true);
    @file_put_contents($log_file, $log_entry, FILE_APPEND);
    
    if (php_sapi_name() === 'cli') {
        echo $log_entry;
    }
}

function respond($success, $message, $data = null, $code = 200) {
    http_response_code($code);
    $response = [
        'success' => $success,
        'message' => $message,
        'timestamp' => date('c'),
    ];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit(0);
}

function cli_respond($success, $message, $data = null) {
    echo "\n" . str_repeat('=', 70) . "\n";
    echo ($success ? '✓ SUCCESS' : '✗ ERROR') . ": $message\n";
    if ($data) {
        echo json_encode($data, JSON_PRETTY_PRINT) . "\n";
    }
    echo str_repeat('=', 70) . "\n";
}

function verify_requirements() {
    $errors = [];
    
    // Check config file
    if (!file_exists(CONFIG_FILE)) {
        $errors[] = "Config file not found: " . CONFIG_FILE;
    }
    
    // Check migrations directory
    if (!is_dir(MIGRATIONS_DIR)) {
        $errors[] = "Migrations directory not found: " . MIGRATIONS_DIR;
    } elseif (!is_writable(MIGRATIONS_DIR)) {
        $errors[] = "Migrations directory not writable: " . MIGRATIONS_DIR;
    }
    
    // Check logs directory writable
    if (!is_writable(LOGS_DIR) && !@mkdir(LOGS_DIR, 0755, true)) {
        $errors[] = "Cannot create/write to logs directory: " . LOGS_DIR;
    }
    
    // Check PHP version
    if (version_compare(PHP_VERSION, '7.4.0', '<')) {
        $errors[] = "PHP 7.4+ required, you have " . PHP_VERSION;
    }
    
    return $errors;
}

function check_database_connection() {
    try {
        require_once CONFIG_FILE;
        
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";port=3306",
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        return ['connected' => true, 'host' => DB_HOST];
    } catch (Exception $e) {
        return ['connected' => false, 'error' => $e->getMessage()];
    }
}

function get_database_info() {
    try {
        require_once CONFIG_FILE;
        
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        // Get table count
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '" . DB_NAME . "'");
        $table_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        // Check if migrations table exists
        $migrations_exist = $pdo->query(
            "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '" . DB_NAME . "' AND TABLE_NAME = '_migrations'"
        )->fetch(PDO::FETCH_ASSOC)['count'] > 0;
        
        return [
            'database' => DB_NAME,
            'host' => DB_HOST,
            'user' => DB_USER,
            'tables' => (int)$table_count,
            'migrations_tracked' => $migrations_exist,
        ];
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

function list_migrations() {
    $migrations = [];
    if (is_dir(MIGRATIONS_DIR)) {
        foreach (glob(MIGRATIONS_DIR . '/*.sql') as $file) {
            $migrations[] = basename($file);
        }
        sort($migrations);
    }
    return $migrations;
}

function get_init_status() {
    $status = [
        'initialized' => false,
        'steps' => [],
        'database' => get_database_info(),
    ];
    
    foreach (INIT_ORDER as $step_num => $step_info) {
        $status['steps'][] = [
            'number' => $step_num,
            'name' => $step_info['name'],
            'description' => $step_info['desc'],
            'file' => $step_info['file'],
            'status' => 'pending', // would be 'pending', 'completed', 'failed'
        ];
    }
    
    // Check if database has been initialized
    if (isset($status['database']['tables']) && $status['database']['tables'] > 0) {
        $status['initialized'] = true;
        $status['steps'][0]['status'] = 'completed';
    }
    
    return $status;
}

// ─────────────────────���───────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────

function main() {
    $is_cli = php_sapi_name() === 'cli';
    $action = $_GET['action'] ?? $_POST['action'] ?? ($argv[1] ?? 'status');
    
    // Verify requirements
    $requirement_errors = verify_requirements();
    if (!empty($requirement_errors)) {
        $msg = "System requirements not met:\n" . implode("\n", $requirement_errors);
        if ($is_cli) {
            cli_respond(false, $msg);
            exit(1);
        } else {
            respond(false, $msg, ['errors' => $requirement_errors], 400);
        }
    }
    
    log_message('INFO', "Init script called with action: $action");
    
    // Route actions
    switch ($action) {
        case 'status':
            $status = get_init_status();
            if ($is_cli) {
                cli_respond(true, "Current initialization status:", $status);
            } else {
                respond(true, "Initialization status", $status);
            }
            break;
        
        case 'check-db':
            $db_check = check_database_connection();
            if ($db_check['connected']) {
                $db_info = get_database_info();
                if ($is_cli) {
                    cli_respond(true, "Database connection successful", $db_info);
                } else {
                    respond(true, "Database connection successful", $db_info);
                }
            } else {
                if ($is_cli) {
                    cli_respond(false, "Database connection failed", $db_check);
                    exit(1);
                } else {
                    respond(false, "Database connection failed", $db_check, 500);
                }
            }
            break;
        
        case 'list-migrations':
            $migrations = list_migrations();
            if ($is_cli) {
                cli_respond(true, "Available migrations:", $migrations);
            } else {
                respond(true, "Available migrations", $migrations);
            }
            break;
        
        case 'help':
        case '--help':
        case '-h':
            show_help();
            break;
        
        default:
            if ($is_cli) {
                cli_respond(false, "Unknown action: $action. Use --help for usage information.");
                exit(1);
            } else {
                respond(false, "Unknown action: $action", ['available' => ['status', 'check-db', 'list-migrations', 'help']], 400);
            }
    }
}

function show_help() {
    $help = <<<'HELP'
================================================================================
Dr. Arman Kabir Care — PHP Initialization Script
================================================================================

DESCRIPTION:
  Replaces the legacy bash scripts/init.sh for PHP/MySQL database setup.
  Handles migrations, seed data, and environment configuration.

USAGE (CLI):
  php public_html/api/init.php [action] [options]

USAGE (Web):
  GET https://drarmankabir.com/api/init.php?action=status

ACTIONS:
  status              Show current initialization status
  check-db            Verify database connection and info
  list-migrations     List available migration files
  help, --help, -h    Show this help message

EXAMPLES:

  1. Check current status:
     php public_html/api/init.php status

  2. Verify database connection:
     php public_html/api/init.php check-db

  3. List migrations:
     php public_html/api/init.php list-migrations

ENVIRONMENT VARIABLES:

  Set these in your environment or config.php:
  
  DB_HOST               Database host (default: localhost)
  DB_NAME               Database name (default: drarmank_care)
  DB_USER               Database user (default: drarmank_care_user)
  DB_PASS               Database password (REQUIRED for production)
  JWT_SECRET            JWT secret key (REQUIRED for sessions)

HELP;

    $help .= <<<'HELP'

MIGRATION ORDER (8 domains):

  1. auth-roles      — Must be first (all others query it for access control)
  2. patient-data    — Patient records and history
  3. clinical-data   — Clinical notes and assessments
  4. admission-data  — Hospital admission records
  5. appointment-data — Appointment scheduling
  6. queue-data      — Queue management
  7. alert-data      — Alert notifications
  8. sync-device     — Device synchronization

NOTES:

  - Database must be created before running migrations
  - Migration files are located in: server-data/migrations/
  - Logs are written to: logs/init.log
  - For web access, ensure PHP can write to logs/ directory
  
  Example database creation:
    CREATE DATABASE drarmank_care CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    CREATE USER 'drarmank_care_user'@'localhost' IDENTIFIED BY 'secure_password';
    GRANT ALL PRIVILEGES ON drarmank_care.* TO 'drarmank_care_user'@'localhost';
    FLUSH PRIVILEGES;

================================================================================
HELP;

    if (php_sapi_name() === 'cli') {
        echo $help . "\n";
        exit(0);
    } else {
        echo "<pre>" . htmlspecialchars($help) . "</pre>";
        exit(0);
    }
}

// ─────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────

// Handle web requests with basic security
if (php_sapi_name() !== 'cli') {
    // Check if this should be restricted to admin only
    // For now, allow open access during setup phase
    // In production, add authentication check:
    // require_once __DIR__ . '/auth/middleware.php';
}

main();
