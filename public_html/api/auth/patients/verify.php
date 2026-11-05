<?php
/** Restore an approved patient session. */
require_once __DIR__ . '/../../database.php';
require_once __DIR__ . '/../../helpers.php';
require_once __DIR__ . '/../middleware.php';

handleCors();
requireMethod('GET');

$user = requireAuth();
if (($user['session_type'] ?? '') !== 'patient') {
    errorResponse('Patient session required.', 403);
}
if (($user['status'] ?? '') !== 'approved') {
    errorResponse('Patient account is not approved.', 403);
}

successResponse([
    'patient' => [
        'id' => (int) $user['id'],
        'patient_id' => (int) $user['patient_id'],
        'phone' => $user['phone'],
        'full_name' => $user['full_name'],
        'name_bn' => $user['name_bn'],
        'gender' => $user['gender'],
        'date_of_birth' => $user['date_of_birth'],
        'register_number' => $user['register_number'],
        'photo_url' => $user['photo_url'],
        'status' => $user['status'],
    ],
], 'Patient session valid');
