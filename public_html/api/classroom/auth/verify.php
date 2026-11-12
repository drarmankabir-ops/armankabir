<?php
/** Restore an approved classroom student session. */
require_once __DIR__ . '/../../config_loader.php';
require_once __DIR__ . '/../../helpers.php';
require_once __DIR__ . '/../../auth/middleware.php';

handleCors();
requireMethod('GET');

$user = requireAuth();
if (($user['session_type'] ?? '') !== 'user' || ($user['role'] ?? '') !== 'student') {
    errorResponse('Classroom student session required.', 403);
}

try {
    $db = Database::getInstance();
    $studentStmt = $db->prepare(
        'SELECT id, student_id, full_name, status FROM classroom_students WHERE user_id = :user_id LIMIT 1',
    );
    $studentStmt->execute([':user_id' => $user['id']]);
    $student = $studentStmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        errorResponse('Student profile not found.', 404);
    }
    if ($student['status'] !== 'approved') {
        errorResponse('Student account is not approved.', 403);
    }

    $coursesStmt = $db->prepare(
        'SELECT ce.course_id, c.title AS course_title, c.category, c.thumbnail_url '
        . 'FROM classroom_enrollments ce '
        . 'JOIN classroom_courses c ON ce.course_id = c.id '
        . "WHERE ce.student_id = :student_id AND ce.status = 'enrolled' "
        . 'ORDER BY ce.enrolled_at DESC',
    );
    $coursesStmt->execute([':student_id' => $student['id']]);

    successResponse([
        'user' => [
            'id' => (int) $user['id'],
            'email' => $user['email'],
            'full_name' => $student['full_name'],
            'student_id' => $student['student_id'],
        ],
        'dashboard' => [
            'enrolled_courses' => $coursesStmt->fetchAll(PDO::FETCH_ASSOC),
        ],
    ], 'Student session valid');
} catch (Throwable $e) {
    error_log('Student session verification error: ' . $e->getMessage());
    errorResponse('Could not verify student session.', 500);
}
