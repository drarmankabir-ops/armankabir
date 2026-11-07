<?php
/**
 * Update Patient Credentials API
 * 
 * POST /api/auth/patients/update.php
 * Headers: Authorization: Bearer <staff-or-patient-token>
 * Body: { "register_number": "RN-001", "phone": "01XXXXXXXXX", "password": "newpass" }
 * 
 * Patients can update their own phone number and/or password.
 * Staff/Admin can also update patient credentials.
 */

require_once __DIR__ . '/../../database.php';
require_once __DIR__ . '/../../helpers.php';
require_once __DIR__ . '/../middleware.php';

handleCors();
requireMethod('POST');

$user = requireAuth();
requireCsrfToken();

$input = getJsonInput();
$missing = validateRequired($input, ['register_number']);
if ($missing) {
    errorResponse('Missing required fields', 400, ['missing_fields' => $missing]);
}

$registerNumber = sanitizeString($input['register_number']);
$isPatient = ($user['session_type'] ?? '') === 'patient';
if (!$isPatient && !hasPermission($user, 'manage_patient_accounts')) {
    errorResponse('Access denied. You cannot manage patient accounts.', 403);
}

$newPhone = isset($input['phone']) ? sanitizePhone($input['phone']) : null;
$newPassword = isset($input['password']) ? $input['password'] : null;

if (!$newPhone && !$newPassword) {
    errorResponse('At least one of phone or password must be provided', 400);
}

if ($newPassword) {
    $passwordError = validatePasswordStrength($newPassword);
    if ($passwordError) {
        errorResponse($passwordError, 400);
    }
}

try {
    $db = Database::getInstance();
    
    // Patients may only update the account tied to their authenticated session.
    if ($isPatient) {
        $patientId = (int) ($user['patient_id'] ?? 0);
        if ($patientId < 1) {
            errorResponse('Patient account is not available for this session.', 403);
        }

        $stmt = $db->prepare('SELECT id, register_number FROM patients WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $patientId]);
        $patient = $stmt->fetch();
        if (!$patient || !hash_equals((string) $patient['register_number'], $registerNumber)) {
            errorResponse('You can only update your own patient account.', 403);
        }
    } else {
        $stmt = $db->prepare('SELECT id FROM patients WHERE register_number = :rn LIMIT 1');
        $stmt->execute([':rn' => $registerNumber]);
        $patient = $stmt->fetch();
    }
    
    if (!$patient) {
        errorResponse('Patient not found with this register number', 404);
    }
    
    $patientId = (int) $patient['id'];
    
    // Find the patient login record
    $stmt = $db->prepare('SELECT * FROM patient_login WHERE patient_id = :pid LIMIT 1');
    $stmt->execute([':pid' => $patientId]);
    $loginRecord = $stmt->fetch();
    
    if (!$loginRecord) {
        errorResponse('Patient login record not found', 404);
    }
    
    // Build update
    $updates = [];
    $params = [':id' => $loginRecord['id']];
    
    if ($newPhone) {
        $updates[] = 'phone = :phone';
        $params[':phone'] = $newPhone;
    }
    
    if ($newPassword) {
        $updates[] = 'password_hash = :password_hash';
        $params[':password_hash'] = password_hash($newPassword, PASSWORD_BCRYPT);
    }
    
    if (!empty($updates)) {
        $updates[] = 'updated_at = NOW()';
        $updateStr = implode(', ', $updates);
        $stmt = $db->prepare("UPDATE patient_login SET $updateStr WHERE id = :id");
        $stmt->execute($params);

        $currentToken = $isPatient ? getBearerToken() : null;
        if ($currentToken !== null) {
            $stmt = $db->prepare('DELETE FROM patient_sessions WHERE patient_login_id = :id AND token <> :token');
            $stmt->execute([':id' => $loginRecord['id'], ':token' => $currentToken]);
        } else {
            $stmt = $db->prepare('DELETE FROM patient_sessions WHERE patient_login_id = :id');
            $stmt->execute([':id' => $loginRecord['id']]);
        }
    }
    
    successResponse([
        'register_number' => $registerNumber,
        'phone_updated' => $newPhone !== null,
        'password_updated' => $newPassword !== null,
    ], 'Patient credentials updated successfully');
    
} catch (\Exception $e) {
    error_log('Update patient credentials error: ' . $e->getMessage());
    errorResponse('Failed to update patient credentials', 500);
}
