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
    fwrite(STDERR, "Set ADMIN_USERNAME to the existing admin email address.\n");
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
    $findContent = $db->prepare('SELECT id FROM admin_accounts WHERE username = :username LIMIT 1');
    $findContent->execute([':username' => $username]);
    $contentAdmin = $findContent->fetch();
    $findUser = $db->prepare("SELECT id, is_active FROM users WHERE email = :email AND role = 'admin' LIMIT 1");
    $findUser->execute([':email' => $username]);
    $userAdmin = $findUser->fetch();

    if (!$contentAdmin && !$userAdmin) {
        $db->rollBack();
        fwrite(STDERR, "Admin account not found; no changes were made.\n");
        exit(1);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    if ($contentAdmin) {
        $updateContent = $db->prepare('UPDATE admin_accounts SET password_hash = :password_hash, is_active = 1 WHERE id = :id');
        $updateContent->execute([':password_hash' => $passwordHash, ':id' => $contentAdmin['id']]);
        $revokeContent = $db->prepare('DELETE FROM admin_sessions WHERE admin_id = :id');
        $revokeContent->execute([':id' => $contentAdmin['id']]);
    } else {
        $insertContent = $db->prepare(
            'INSERT INTO admin_accounts (username, password_hash, display_name, is_active) VALUES (:username, :password_hash, :display_name, 1)'
        );
        $insertContent->execute([
            ':username' => $username,
            ':password_hash' => $passwordHash,
            ':display_name' => $displayName,
        ]);
    }

    if ($userAdmin) {
        $updateUser = $db->prepare('UPDATE users SET password_hash = :password_hash, is_active = 1, registration_status = \'approved\' WHERE id = :id');
        $updateUser->execute([':password_hash' => $passwordHash, ':id' => $userAdmin['id']]);
        $revokeUser = $db->prepare('DELETE FROM user_sessions WHERE user_id = :id');
        $revokeUser->execute([':id' => $userAdmin['id']]);
    } else {
        $insertUser = $db->prepare(
            'INSERT INTO users (email, password_hash, full_name, role, is_active, registration_status, email_verified_at) VALUES (:email, :password_hash, :full_name, \'admin\', 1, \'approved\', NOW())'
        );
        $insertUser->execute([
            ':email' => $username,
            ':password_hash' => $passwordHash,
            ':full_name' => $displayName,
        ]);
    }
    $db->commit();
} catch (Throwable $error) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    fwrite(STDERR, "Could not reset admin password. Confirm database configuration and migrations.\n");
    exit(1);
}

fwrite(STDOUT, "Admin password reset; all existing admin sessions were revoked.\n");
if ($generatedPassword) {
    fwrite(STDOUT, "Generated password (shown once): {$password}\n");
} else {
    fwrite(STDOUT, "Password: supplied through ADMIN_PASSWORD.\n");
}