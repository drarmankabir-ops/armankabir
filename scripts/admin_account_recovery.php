<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$scriptName = basename((string) ($_SERVER['argv'][0] ?? ''));
$command = match ($scriptName) {
    'provision_admin.php' => 'provision',
    'reset_admin_password.php' => 'reset',
    default => (string) ($_SERVER['argv'][1] ?? ''),
};

if (!in_array($command, ['recover', 'reset', 'provision'], true)) {
    fwrite(STDERR, "Usage: php admin_account_recovery.php <recover|reset|provision>\n");
    exit(2);
}

function recoveryFail(string $message, int $status = 1): never
{
    fwrite(STDERR, $message . "\n");
    exit($status);
}

function readInput(string $prompt): string
{
    fwrite(STDOUT, $prompt);
    $value = fgets(STDIN);
    if ($value === false) {
        recoveryFail('Could not read terminal input.');
    }
    return trim($value);
}

function readNewPassword(): string
{
    $password = getenv('ADMIN_NEW_PASSWORD');
    $confirmation = getenv('ADMIN_NEW_PASSWORD_CONFIRM');
    if ($password === false || $confirmation === false) {
        recoveryFail('Set ADMIN_NEW_PASSWORD and ADMIN_NEW_PASSWORD_CONFIRM using hidden terminal input before running this command.');
    }
    putenv('ADMIN_NEW_PASSWORD');
    putenv('ADMIN_NEW_PASSWORD_CONFIRM');
    if (strlen($password) < 16 || strlen($password) > 128) {
        recoveryFail('Password must be between 16 and 128 bytes.');
    }
    if (!hash_equals($password, $confirmation)) {
        recoveryFail('Passwords do not match.');
    }
    return $password;
}

function backupAdminTables(PDO $db, string $baseDirectory): string
{
    $tables = ['admin_accounts', 'admin_sessions', 'users', 'user_sessions'];
    $backupDirectory = getenv('ADMIN_BACKUP_DIR') ?: $baseDirectory . '/private-admin-backups';

    if (!is_dir($backupDirectory) && !mkdir($backupDirectory, 0700, true) && !is_dir($backupDirectory)) {
        throw new RuntimeException('Could not create the private backup directory.');
    }
    if (!chmod($backupDirectory, 0700)) {
        throw new RuntimeException('Could not secure the private backup directory permissions.');
    }
    $resolvedBackupDirectory = realpath($backupDirectory);
    $documentRoot = realpath($baseDirectory . '/public_html');
    if (
        $resolvedBackupDirectory === false ||
        ($documentRoot !== false &&
            ($resolvedBackupDirectory === $documentRoot ||
                str_starts_with($resolvedBackupDirectory, $documentRoot . DIRECTORY_SEPARATOR)))
    ) {
        throw new RuntimeException('The backup directory must be outside the public web root.');
    }

    $backupPath = $resolvedBackupDirectory . '/admin-auth-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.sql';
    $file = fopen($backupPath, 'x');
    if ($file === false) {
        throw new RuntimeException('Could not create a private database backup.');
    }
    if (!chmod($backupPath, 0600)) {
        fclose($file);
        unlink($backupPath);
        throw new RuntimeException('Could not secure the database backup permissions.');
    }

    try {
        $write = static function (string $contents) use ($file): void {
            $length = strlen($contents);
            $offset = 0;
            while ($offset < $length) {
                $written = fwrite($file, substr($contents, $offset));
                if ($written === false || $written === 0) {
                    throw new RuntimeException('Could not write the database backup to disk.');
                }
                $offset += $written;
            }
        };
        $write("-- Private pre-change backup of admin authentication tables.\n");
        $write("-- Contains password hashes; keep this file confidential.\n");
        foreach ($tables as $table) {
            $create = $db->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_NUM);
            if (!$create || !isset($create[1])) {
                throw new RuntimeException("Could not read the {$table} table definition.");
            }
            $write("\n-- Table structure for `{$table}`\n{$create[1]};\n");

            $rows = $db->query("SELECT * FROM `{$table}`");
            $columns = [];
            for ($index = 0; $index < $rows->columnCount(); $index++) {
                $meta = $rows->getColumnMeta($index);
                $columns[] = '`' . str_replace('`', '``', (string) $meta['name']) . '`';
            }
            $columnList = implode(', ', $columns);
            while ($row = $rows->fetch(PDO::FETCH_NUM)) {
                $values = array_map(static function (mixed $value) use ($db): string {
                    if ($value === null) {
                        return 'NULL';
                    }
                    $quoted = $db->quote((string) $value);
                    if ($quoted === false) {
                        throw new RuntimeException('Could not encode a database backup value.');
                    }
                    return $quoted;
                }, $row);
                $write("INSERT INTO `{$table}` ({$columnList}) VALUES (" . implode(', ', $values) . ");\n");
            }
        }
        if (!fflush($file)) {
            throw new RuntimeException('Could not flush the database backup to disk.');
        }
    } catch (Throwable $error) {
        fclose($file);
        unlink($backupPath);
        throw $error;
    }

    fclose($file);
    chmod($backupPath, 0600);
    return $backupPath;
}

$baseDirectory = dirname(__DIR__);
$databaseBootstrap = $baseDirectory . '/public_html/api/database.php';
if (!is_file($databaseBootstrap)) {
    recoveryFail('Could not locate public_html/api/database.php relative to this script.');
}
require_once $databaseBootstrap;

try {
    $db = Database::getInstance();

    if ($command === 'recover') {
        $contentAdmins = $db->query(
            'SELECT username, display_name, is_active FROM admin_accounts ORDER BY username'
        )->fetchAll(PDO::FETCH_ASSOC);
        $systemAdmins = $db->query(
            "SELECT email AS username, full_name AS display_name, is_active FROM users WHERE role = 'admin' ORDER BY email"
        )->fetchAll(PDO::FETCH_ASSOC);

        if (!$contentAdmins && !$systemAdmins) {
            fwrite(STDOUT, "No Admin accounts were found in admin_accounts or users.\n");
            exit(0);
        }
        foreach ($contentAdmins as $admin) {
            fwrite(STDOUT, sprintf(
                "Portal admin: %s (%s; %s)\n",
                $admin['username'],
                $admin['display_name'],
                (int) $admin['is_active'] === 1 ? 'active' : 'inactive'
            ));
        }
        foreach ($systemAdmins as $admin) {
            fwrite(STDOUT, sprintf(
                "System admin: %s (%s; %s)\n",
                $admin['username'],
                $admin['display_name'],
                (int) $admin['is_active'] === 1 ? 'active' : 'inactive'
            ));
        }
        exit(0);
    }

    if ($command === 'provision') {
        $username = readInput('New Admin username (email address): ');
        $displayName = readInput('Display name: ');
        if (!filter_var($username, FILTER_VALIDATE_EMAIL) || strlen($username) > 255) {
            recoveryFail('Username must be a valid email address of at most 255 characters.');
        }
        if ($displayName === '' || strlen($displayName) > 255) {
            recoveryFail('Display name must be between 1 and 255 characters.');
        }

        $password = readNewPassword();
        $db->beginTransaction();
        $contentCount = (int) $db->query('SELECT COUNT(*) FROM admin_accounts')->fetchColumn();
        $systemCount = (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        if ($contentCount > 0 || $systemCount > 0) {
            $db->rollBack();
            recoveryFail('An Admin already exists; initial provisioning is disabled. Use reset instead.');
        }
        $existingUser = $db->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
        $existingUser->execute([':email' => $username]);
        if ($existingUser->fetch()) {
            $db->rollBack();
            recoveryFail('That email is already used by another account; no records were changed.');
        }

        $backupPath = backupAdminTables($db, $baseDirectory);
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        if ($passwordHash === false) {
            throw new RuntimeException('Could not hash the new password.');
        }
        $insertContentAdmin = $db->prepare(
            'INSERT INTO admin_accounts (username, password_hash, display_name, is_active) VALUES (:username, :password_hash, :display_name, 1)'
        );
        $insertContentAdmin->execute([
            ':username' => $username,
            ':password_hash' => $passwordHash,
            ':display_name' => $displayName,
        ]);
        $insertSystemAdmin = $db->prepare(
            "INSERT INTO users (email, password_hash, full_name, role, is_active, registration_status, email_verified_at)
             VALUES (:email, :password_hash, :full_name, 'admin', 1, 'approved', NOW())"
        );
        $insertSystemAdmin->execute([
            ':email' => $username,
            ':password_hash' => $passwordHash,
            ':full_name' => $displayName,
        ]);
        $db->commit();
        fwrite(STDOUT, "Initial Admin provisioned. Save the private backup path securely: {$backupPath}\n");
        exit(0);
    }

    $username = readInput('Existing Admin username: ');
    $findContent = $db->prepare(
        'SELECT id, username, display_name FROM admin_accounts WHERE username = :username LIMIT 1'
    );
    $findContent->execute([':username' => $username]);
    $contentAdmin = $findContent->fetch(PDO::FETCH_ASSOC);

    $findSystem = $db->prepare(
        "SELECT id, email, full_name, is_active, registration_status
         FROM users WHERE email = :email AND role = 'admin' LIMIT 1"
    );
    $findSystem->execute([':email' => $username]);
    $systemAdmin = $findSystem->fetch(PDO::FETCH_ASSOC);
    if (!$contentAdmin && !$systemAdmin) {
        recoveryFail('No matching Admin account was found; no records were changed.');
    }

    $password = readNewPassword();
    $db->beginTransaction();
    $backupPath = backupAdminTables($db, $baseDirectory);
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    if ($passwordHash === false) {
        throw new RuntimeException('Could not hash the new password.');
    }

    if ($contentAdmin) {
        $updateContent = $db->prepare('UPDATE admin_accounts SET password_hash = :password_hash WHERE id = :id');
        $updateContent->execute([':password_hash' => $passwordHash, ':id' => $contentAdmin['id']]);
        $revokeContent = $db->prepare('DELETE FROM admin_sessions WHERE admin_id = :id');
        $revokeContent->execute([':id' => $contentAdmin['id']]);
    } else {
        $active = (int) $systemAdmin['is_active'] === 1
            && ($systemAdmin['registration_status'] ?? 'approved') === 'approved' ? 1 : 0;
        $insertContent = $db->prepare(
            'INSERT INTO admin_accounts (username, password_hash, display_name, is_active) VALUES (:username, :password_hash, :display_name, :is_active)'
        );
        $insertContent->execute([
            ':username' => $username,
            ':password_hash' => $passwordHash,
            ':display_name' => $systemAdmin['full_name'],
            ':is_active' => $active,
        ]);
        $contentAdminId = (int) $db->lastInsertId();
        $db->prepare('DELETE FROM admin_sessions WHERE admin_id = :id')->execute([':id' => $contentAdminId]);
    }

    if ($systemAdmin) {
        $updateSystem = $db->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id');
        $updateSystem->execute([':password_hash' => $passwordHash, ':id' => $systemAdmin['id']]);
        $db->prepare('DELETE FROM user_sessions WHERE user_id = :id')
            ->execute([':id' => $systemAdmin['id']]);
    }
    $db->commit();

    fwrite(STDOUT, "Admin password reset; matching Admin sessions were revoked. Account roles and active/approval statuses were preserved.\n");
    fwrite(STDOUT, "Private pre-change backup: {$backupPath}\n");
} catch (Throwable $error) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    error_log('Admin account recovery failed: ' . $error->getMessage());
    recoveryFail('Admin recovery failed. Check the PHP error log; no password or hash was printed.');
}
