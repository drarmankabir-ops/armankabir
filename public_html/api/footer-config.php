<?php
/**
 * Dr. Arman Kabir Care — Dynamic Footer Configuration
 * 
 * Replaces static footer links with dynamic PHP configuration
 * Loaded via cPanel environment variables
 * No external service dependencies (no Caffeine, no external CDNs)
 * 
 * Usage:
 * - Call from any frontend page to get footer configuration
 * - Supports custom branding, copyright text, and links
 * - Returns JSON for React frontend integration
 */

header('Content-Type: application/json; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// ─────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────

define('PROJECT_ROOT', realpath(__DIR__ . '/../../'));
define('CONFIG_FILE', PROJECT_ROOT . '/config.php');

// Default footer configuration
$DEFAULT_FOOTER_CONFIG = [
    'organization_name' => 'Dr. Arman Kabir Care',
    'organization_url' => 'https://drarmankabir.com',
    'copyright_text' => 'Dr. Arman Kabir Care',
    'copyright_year' => date('Y'),
    'tagline' => 'Healthcare Management System',
    'backend' => 'PHP & MySQL',
    'hosting' => 'cPanel',
    'links' => [
        [
            'label' => 'Website',
            'url' => 'https://drarmankabir.com',
            'target' => '_blank',
        ],
        [
            'label' => 'Privacy Policy',
            'url' => '/privacy',
            'target' => '_self',
        ],
        [
            'label' => 'Contact Us',
            'url' => '/contact',
            'target' => '_self',
        ],
    ],
    'show_powered_by' => true,
    'powered_by_text' => 'Powered by PHP & MySQL on cPanel',
];

// ─────────────────────────────────────────────────────────────────────────
// FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get footer configuration from environment or database
 */
function get_footer_config() {
    global $DEFAULT_FOOTER_CONFIG;
    
    try {
        // Load from config.php if available
        if (file_exists(CONFIG_FILE)) {
            require_once CONFIG_FILE;
        }
        
        // Check for database-stored configuration
        $config = get_site_settings_from_db();
        
        if ($config) {
            return array_merge($DEFAULT_FOOTER_CONFIG, $config);
        }
    } catch (Exception $e) {
        error_log('Footer config error: ' . $e->getMessage());
    }
    
    return $DEFAULT_FOOTER_CONFIG;
}

/**
 * Get site settings from database
 */
function get_site_settings_from_db() {
    try {
        require_once CONFIG_FILE;
        
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        $stmt = $pdo->query("SELECT * FROM site_settings WHERE setting_key LIKE 'footer_%'");
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $config = [];
        foreach ($results as $row) {
            $key = str_replace('footer_', '', $row['setting_key']);
            $config[$key] = json_decode($row['setting_value'], true) ?? $row['setting_value'];
        }
        
        return !empty($config) ? $config : null;
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Validate footer configuration
 */
function validate_footer_config($config) {
    $required_fields = ['organization_name', 'organization_url', 'copyright_text'];
    
    foreach ($required_fields as $field) {
        if (empty($config[$field])) {
            return false;
        }
    }
    
    return true;
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────

function main() {
    // Get footer configuration
    $config = get_footer_config();
    
    // Validate
    if (!validate_footer_config($config)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Footer configuration is invalid',
        ]);
        exit(1);
    }
    
    // Add metadata
    $config['timestamp'] = date('c');
    $config['cached'] = false; // Can be optimized with caching
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $config,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit(0);
}

// Run
main();
