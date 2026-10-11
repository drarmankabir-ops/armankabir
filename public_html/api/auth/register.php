<?php
/**
 * Doctor/Staff Registration API
 *
 * POST /api/auth/register.php
 * Body: {
 *   "email": "...",
 *   "password": "...",
 *   "full_name": "...",
 *   "name_bn": "...",
 *   "designation": "Dr.|Prof.|Mr.|Ms.|...",
 *   "degree": "...",
 *   "hospital_name": "...",
 *   "role": "doctor|nurse|reception|...",
 *   "specialization": "...",
 *   "phone": "...",
 *   "bmdc_registration": "..."
 * }
 *
 * Creates a user account with registration_status='pending'.
 * Admin must approve before the account can log in.
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';

handleCors();
requireMethod('POST');
checkRateLimit('register_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));

$input = getJsonInput();

// Validate required fields
$missing = validateRequired($input, ['email', 'password', 'full_name']);
if ($missing) {
    errorResponse('Missing required fields', 400, [
        'missing_fields' => $missing,
    ]);
}

$email = sanitizeEmail($input['email']);
$password = $input['password'];
$fullName = trim($input['full_name']);
$nameBn = trim($input['name_bn'] ?? '');
$designation = trim($input['designation'] ?? '');
$degree = trim($input['degree'] ?? '');
$hospitalName = trim($input['hospital_name'] ?? '');
$role = trim($input['role'] ?? 'doctor');
$specialization = trim($input['specialization'] ?? '');
$phone = sanitizePhone($input['phone'] ?? '');
$bmdcRegistration = trim($input['bmdc_registration'] ?? '');

// Normalise empty optional strings to null so they are stored as NULL, not ''.
$designation = $designation !== '' ? $designation : null;
$degree = $degree !== '' ? $degree : null;
$hospitalName = $hospitalName !== '' ? $hospitalName : null;
$nameBn = $nameBn !== '' ? $nameBn : null;
$specialization = $specialization !== '' ? $specialization : null;
$phone = $phone !== '' ? $phone : null;
$bmdcRegistration = $bmdcRegistration !== '' ? $bmdcRegistration : null;

// Validate email
if (empty($email)) {
    errorResponse('Invalid email address', 400);
}

// Validate password strength
if (strlen($password) < 6) {
    errorResponse('Password must be at least 6 characters', 400);
}

// Validate role
if (!in_array($role, staffRoles(), true)) {
    errorResponse('Invalid role specified', 400);
}

try {
    $db = Database::getInstance();

    // Self-heal the users table if a restored database is missing auth columns.
    ensureUsersSchema($db);

    // Check if email already exists
    $stmt = $db->prepare('SELECT id, email, registration_status FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $existing = $stmt->fetch();

    if ($existing) {
        if ($existing['registration_status'] === 'rejected') {
            // Re-registration after rejection - update the record
            $passwordHash = password_hash($password, PASSWORD_BCRYPT);
            $updateStmt = $db->prepare('
                UPDATE users SET
                    password_hash = :password_hash,
                    full_name = :full_name,
                    name_bn = :name_bn,
                    designation = :designation,
                    degree = :degree,
                    hospital_name = :hospital_name,
                    role = :role,
                    specialization = :specialization,
                    phone = :phone,
                    bmdc_registration = :bmdc_registration,
                    registration_status = "pending",
                    approved_by = NULL,
                    approved_at = NULL,
                    updated_at = NOW()
                WHERE id = :id
            ');
            $updateStmt->execute([
                ':password_hash' => $passwordHash,
                ':full_name' => $fullName,
                ':name_bn' => $nameBn,
                ':designation' => $designation,
                ':degree' => $degree,
                ':hospital_name' => $hospitalName,
                ':role' => $role,
                ':specialization' => $specialization,
                ':phone' => $phone,
                ':bmdc_registration' => $bmdcRegistration,
                ':id' => $existing['id'],
            ]);

            assertRowsAffected($updateStmt, 'register.reregister', 're-registration');

            // Log audit
            logAudit(null, null, 'update', 'user', $existing['id'],
                ['action' => 're-registration'],
                ['email' => $email, 'role' => $role]
            );

            successResponse([
                'user_id' => (int) $existing['id'],
                'status' => 'pending',
            ], 'Registration updated');
        }

        errorResponse('This email is already registered in the system.', 409);
    }

    // Hash password
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    // Insert new user with pending status
    $stmt = $db->prepare('
        INSERT INTO users (email, password_hash, full_name, name_bn, designation, degree, hospital_name, role, specialization, phone, bmdc_registration, is_active, registration_status, email_verified_at)
        VALUES (:email, :password_hash, :full_name, :name_bn, :designation, :degree, :hospital_name, :role, :specialization, :phone, :bmdc_registration, 1, "pending", NULL)
    ');
    $stmt->execute([
        ':email' => $email,
        ':password_hash' => $passwordHash,
        ':full_name' => $fullName,
        ':name_bn' => $nameBn,
        ':designation' => $designation,
        ':degree' => $degree,
        ':hospital_name' => $hospitalName,
        ':role' => $role,
        ':specialization' => $specialization,
        ':phone' => $phone,
        ':bmdc_registration' => $bmdcRegistration,
    ]);

    $userId = (int) $db->lastInsertId();

    // Never report success unless the row actually exists in MySQL.
    if ($userId < 1) {
        authError('register.insert', 'INSERT returned no lastInsertId', [
            'email' => $email,
            'request_id' => getRequestId(),
        ]);
        errorResponse('Registration failed. Please try again.', 500);
    }

    $verify = $db->prepare('SELECT id FROM users WHERE id = :id LIMIT 1');
    $verify->execute([':id' => $userId]);
    if (!$verify->fetchColumn()) {
        authError('register.insert', 'Row not found after INSERT', [
            'user_id' => $userId,
            'email' => $email,
        ]);
        errorResponse('Registration failed. Please try again.', 500);
    }

    // Log audit
    logAudit($userId, null, 'create', 'user', $userId, null,
        ['email' => $email, 'role' => $role, 'registration_status' => 'pending']
    );

    successResponse([
        'user_id' => $userId,
        'email' => $email,
        'full_name' => $fullName,
        'role' => $role,
        'status' => 'pending',
    ], 'Registration successful');

} catch (PDOException $e) {
    dbErrorResponse($e, 'register.insert', ['email' => $email]);
} catch (\Throwable $e) {
    authError('register', $e->getMessage(), [
        'email' => $email,
        'request_id' => getRequestId(),
    ]);
    errorResponse('Registration failed. Please try again.', 500);
}