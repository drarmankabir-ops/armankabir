<?php
/**
 * List Patients API
 * 
 * GET /api/patients/list.php
 * Query: ?page=1&limit=20&search=text&type=outdoor&status=Active
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth/middleware.php';

handleCors();
requireMethod('GET');

$user = requireAuth();
$isPatient = ($user['session_type'] ?? '') === 'patient';
$canViewAllPatients = hasPermission($user, 'view_all_patients')
    || hasPermission($user, 'view_patients');
$canViewAssignedPatients = hasPermission($user, 'view_assigned_patients');
if (!$isPatient && !$canViewAllPatients && !$canViewAssignedPatients) {
    errorResponse('Access denied. You cannot view patient records.', 403);
}

$pagination = getPaginationParams();

try {
    $db = Database::getInstance();
    
    $where = [];
    $params = [];

    if ($isPatient) {
        $patientId = (int) ($user['patient_id'] ?? 0);
        if ($patientId < 1) {
            errorResponse('Patient account is not available for this session.', 403);
        }
        $where[] = 'p.id = :session_patient_id';
        $params[':session_patient_id'] = $patientId;
    } elseif (!$canViewAllPatients) {
        $where[] = 'EXISTS (SELECT 1 FROM patient_consultants pc_scope WHERE pc_scope.patient_id = p.id AND pc_scope.consultant_id = :session_user_id AND pc_scope.is_active = 1)';
        $params[':session_user_id'] = (int) $user['id'];
    }
    
    // Search filter
    $search = trim(getParam('search', ''));
    if ($search) {
        $where[] = '(p.full_name LIKE :search OR p.name_bn LIKE :search2 OR p.phone LIKE :search3 OR p.email LIKE :search4 OR p.register_number LIKE :search5)';
        $params[':search'] = "%$search%";
        $params[':search2'] = "%$search%";
        $params[':search3'] = "%$search%";
        $params[':search4'] = "%$search%";
        $params[':search5'] = "%$search%";
    }
    
    // Patient type filter
    $type = getParam('type', '');
    if ($type && in_array($type, ['outdoor', 'indoor', 'emergency', 'admitted'])) {
        $where[] = 'p.patient_type = :type';
        $params[':type'] = $type;
    }
    
    // Status filter
    $status = getParam('status', '');
    if ($status && in_array($status, ['Active', 'Inactive', 'Deceased'])) {
        $where[] = 'p.status = :status';
        $params[':status'] = $status;
    }
    
    // Consultant filter (for doctors)
    $consultantId = getParam('consultant_id', '');
    if ($consultantId) {
        $where[] = 'EXISTS (SELECT 1 FROM patient_consultants pc WHERE pc.patient_id = p.id AND pc.consultant_id = :consultant_id AND pc.is_active = 1)';
        $params[':consultant_id'] = $consultantId;
    }
    
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Get total count
    $countStmt = $db->prepare("SELECT COUNT(*) as total FROM patients p $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];
    
    // Get patients
    $stmt = $db->prepare("
        SELECT p.*, 
               (SELECT JSON_ARRAYAGG(JSON_OBJECT('consultant_id', pc.consultant_id, 'assigned_at', pc.assigned_at))
                FROM patient_consultants pc WHERE pc.patient_id = p.id AND pc.is_active = 1) as consultants
        FROM patients p
        $whereClause
        ORDER BY p.created_at DESC
        LIMIT :limit OFFSET :offset
    ");
    
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val);
    }
    $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
    $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
    $stmt->execute();
    
    $patients = $stmt->fetchAll();
    
    // Decode JSON fields
    foreach ($patients as &$patient) {
        $patient['allergies'] = json_decode($patient['allergies'] ?? '[]', true) ?: [];
        $patient['chronic_conditions'] = json_decode($patient['chronic_conditions'] ?? '[]', true) ?: [];
        $patient['consultants'] = json_decode($patient['consultants'] ?? '[]', true) ?: [];
        $patient['id'] = (int)$patient['id'];
        $patient['weight'] = $patient['weight'] ? (float)$patient['weight'] : null;
        $patient['height'] = $patient['height'] ? (float)$patient['height'] : null;
    }
    
    paginatedResponse($patients, $total, $pagination['page'], $pagination['limit']);
    
} catch (\Exception $e) {
    error_log('List patients error: ' . $e->getMessage());
    errorResponse('Failed to fetch patients', 500);
}
