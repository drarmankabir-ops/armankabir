<?php
/**
 * List Clinical Encounters API
 * GET /api/clinical/encounters-list.php?patientId=1
 */
require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth/middleware.php';
handleCors();
requireMethod('GET');
$user = requireAuth();
$pagination = getPaginationParams();
try {
    $db = Database::getInstance();
    $where = ['1=1'];
    $params = [];
    $patientId = (int) getParam('patientId', 0);
    if ($patientId > 0) {
        requirePatientScope($user, $patientId);
        $where[] = 'v.patient_id = :patient_id';
        $params[':patient_id'] = $patientId;
    } else {
        $scope = patientScopeFilter($user, $params, 'v.patient_id');
        if ($scope !== null) $where[] = $scope;
    }
    $whereClause = 'WHERE ' . implode(' AND ', $where);
    $countStmt = $db->prepare("SELECT COUNT(*) as total FROM visits v $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetch()['total'];
    $stmt = $db->prepare("SELECT v.*, u.full_name as doctor_name FROM visits v LEFT JOIN users u ON v.created_by = u.id $whereClause ORDER BY v.visit_date DESC LIMIT :limit OFFSET :offset");
    foreach ($params as $key => $val) $stmt->bindValue($key, $val);
    $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
    $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
    $stmt->execute();
    paginatedResponse($stmt->fetchAll(), $total, $pagination['page'], $pagination['limit']);
} catch (\Exception $e) {
    error_log('List encounters error: ' . $e->getMessage());
    errorResponse('Failed to fetch encounters', 500);
}
