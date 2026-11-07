<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$username = trim(getenv('ADMIN_USERNAME') ?: '');
$displayName = trim(getenv('ADMIN_DISPLAY_NAME') ?: 'Administrator');
$password = getenv('ADMIN_PASSWORD');
$generatedPassword = $password === false || $password === '';

if (!filter_var($username, FILTER_VALIDATE_EMAIL) || strlen($username) > 255) {
    fwrite(STDERR, "ADMIN_USERNAME must be a valid email address of at most 255 characters.\n");
    exit(1);
}

if ($displayName === '' || strlen($displayName) > 255) {
    fwrite(STDERR, "ADMIN_DISPLAY_NAME must be between 1 and 255 characters.\n");
    exit(1);
}

if ($generatedPassword) {
    $password = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
} elseif (strlen($password) < 16) {
    fwrite(STDERR, "ADMIN_PASSWORD must be at least 16 characters.\n");
    exit(1);
}

require_once __DIR__ . '/../public_html/api/database.php';

try {
    $db = Database::getInstance();
    $db->beginTransaction();
    $adminCount = (int) $db->query('SELECT COUNT(*) FROM admin_accounts')->fetchColumn();
    $userAdminCount = (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
    if ($adminCount > 0 || $userAdminCount > 0) {
        $db->rollBack();
        fwrite(STDERR, "An admin account already exists; initial provisioning is disabled. Use the CLI reset process if needed.\n");
        exit(1);
    }

    $existingEmail = $db->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $existingEmail->execute([':email' => $username]);
    if ($existingEmail->fetch()) {
        $db->rollBack();
        fwrite(STDERR, "ADMIN_USERNAME is already used by a user account. Choose a different email.\n");
        exit(1);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $insertContentAdmin = $db->prepare(
        'INSERT INTO admin_accounts (username, password_hash, display_name, is_active) VALUES (:username, :password_hash, :display_name, 1)'
    );
    $insertContentAdmin->execute([
        ':username' => $username,
        ':password_hash' => $passwordHash,
        ':display_name' => $displayName,
    ]);

    $insertUserAdmin = $db->prepare(
        'INSERT INTO users (email, password_hash, full_name, role, is_active, registration_status, email_verified_at) VALUES (:email, :password_hash, :full_name, \'admin\', 1, \'approved\', NOW())'
    );
    $insertUserAdmin->execute([
        ':email' => $username,
        ':password_hash' => $passwordHash,
        ':full_name' => $displayName,
    ]);
    $db->commit();
} catch (Throwable $error) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    fwrite(STDERR, "Could not provision admin. Confirm the database is configured and migration 003 has run.\n");
    exit(1);
}

fwrite(STDOUT, "Admin account created.\nUsername: {$username}\n");
if ($generatedPassword) {
    fwrite(STDOUT, "Generated password (shown once): {$password}\n");
} else {
    fwrite(STDOUT, "Password: supplied through ADMIN_PASSWORD.\n");
}