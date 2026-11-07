<?php

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../public_html/api/database.php';

$username = trim(getenv('ADMIN_USERNAME') ?: 'admin');
$displayName = trim(getenv('ADMIN_DISPLAY_NAME') ?: 'Administrator');
$password = getenv('ADMIN_PASSWORD');
$generatedPassword = $password === false || $password === '';

if ($username === '' || strlen($username) > 255) {
    fwrite(STDERR, "ADMIN_USERNAME must be between 1 and 255 characters.\n");
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

try {
    $db = Database::getInstance();
    $check = $db->prepare('SELECT id FROM admin_accounts WHERE username = :username LIMIT 1');
    $check->execute([':username' => $username]);

    if ($check->fetch()) {
        fwrite(STDERR, "Admin username already exists; no changes were made. Set ADMIN_USERNAME to a new username.\n");
        exit(1);
    }

    $insert = $db->prepare(
        'INSERT INTO admin_accounts (username, password_hash, display_name, is_active) VALUES (:username, :password_hash, :display_name, 1)'
    );
    $insert->execute([
        ':username' => $username,
        ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
        ':display_name' => $displayName,
    ]);
} catch (Throwable $error) {
    fwrite(STDERR, "Could not provision admin. Confirm the database is configured and migration 003 has run.\n");
    exit(1);
}

fwrite(STDOUT, "Admin account created.\nUsername: {$username}\n");
if ($generatedPassword) {
    fwrite(STDOUT, "Generated password (shown once): {$password}\n");
} else {
    fwrite(STDOUT, "Password: supplied through ADMIN_PASSWORD.\n");
}