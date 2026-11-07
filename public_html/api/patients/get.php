<?php
/**
 * Get Single Patient API
 * 
 * GET /api/patients/get.php?id=123
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth/middleware.php';

handleCors();
requireMethod('GET');

$user = requireAuth();
$id = (int)getParam('id', 0);

if (!$id) {
    errorResponse('Patient ID is required', 400);
}

try {
    $db = Database::getInstance();
    
    $stmt = $db->prepare('
        SELECT p.*,
               (SELECT JSON_ARRAYAGG(JSON_OBJECT("consultant_id", pc.consultant_id, "assigned_at", pc.assigned_at))
                FROM patient_consultants pc WHERE pc.patient_id = p.id AND pc.is_active = 1) as consultants
        FROM patients p
        WHERE p.id = :id
        LIMIT 1
    ');
    $stmt->execute([':id' => $id]);
    $patient = $stmt->fetch();
    
    if (!$patient) {
        errorResponse('Patient not found', 404);
    }

    if (($user['session_type'] ?? '') === 'patient') {
        if ((int) ($user['patient_id'] ?? 0) !== $id) {
            errorResponse('Access denied. You can only view your own patient record.', 403);
        }
    } elseif (!hasPermission($user, 'view_all_patients')
        && !hasPermission($user, 'view_patients')) {
        if (!hasPermission($user, 'view_assigned_patients')) {
            errorResponse('Access denied. You cannot view this patient record.', 403);
        }
        $assignment = $db->prepare('SELECT 1 FROM patient_consultants WHERE patient_id = :patient_id AND consultant_id = :user_id AND is_active = 1 LIMIT 1');
        $assignment->execute([':patient_id' => $id, ':user_id' => (int) $user['id']]);
        if (!$assignment->fetchColumn()) {
            errorResponse('Access denied. This patient is not assigned to you.', 403);
        }
    }
    
    // Decode JSON fields
    $patient['allergies'] = json_decode($patient['allergies'] ?? '[]', true) ?: [];
    $patient['chronic_conditions'] = json_decode($patient['chronic_conditions'] ?? '[]', true) ?: [];
    $patient['consultants'] = json_decode($patient['consultants'] ?? '[]', true) ?: [];
    $patient['id'] = (int)$patient['id'];
    $patient['weight'] = $patient['weight'] ? (float)$patient['weight'] : null;
    $patient['height'] = $patient['height'] ? (float)$patient['height'] : null;
    
    successResponse($patient);
    
} catch (\Exception $e) {
    error_log('Get patient error: ' . $e->getMessage());
    errorResponse('Failed to fetch patient', 500);
}
