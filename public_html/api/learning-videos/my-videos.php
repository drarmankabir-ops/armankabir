<?php
/** Shared library endpoint for future purchases and Classroom enrollment grants. */
require_once __DIR__ . '/common.php';

handleCors();
requireMethod('GET');
$user = learningVideoUser();

try {
    $stmt = Database::getInstance()->prepare(
        'SELECT v.id, v.title, v.description, v.category, v.thumbnail_url, '
        . 'v.duration_seconds, v.access_type, v.price, v.currency, g.grant_type, '
        . 'pr.seconds_watched, pr.completed_at, pr.last_accessed_at '
        . 'FROM learning_video_grants g '
        . 'JOIN learning_videos v ON v.id = g.video_id '
        . 'LEFT JOIN learning_video_purchases p ON p.id = g.purchase_id '
        . 'LEFT JOIN learning_video_progress pr ON pr.user_id = g.user_id AND pr.video_id = g.video_id '
        . 'WHERE g.user_id = :user_id AND g.status = "active" '
        . 'AND g.valid_from <= NOW() AND (g.valid_until IS NULL OR g.valid_until > NOW()) '
        . 'AND v.deleted_at IS NULL '
        . 'AND (v.access_type <> "paid" OR g.grant_type = "classroom_enrollment" '
        . 'OR (g.grant_type = "purchase" AND p.payment_status = "verified" '
        . 'AND p.user_id = g.user_id AND p.video_id = g.video_id)) '
        . 'ORDER BY g.created_at DESC'
    );
    $stmt->execute([':user_id' => (int) $user['id']]);
    successResponse(['videos' => $stmt->fetchAll(PDO::FETCH_ASSOC)], 'My videos retrieved');
} catch (Throwable $e) {
    error_log('Learning video library error: ' . $e->getMessage());
    errorResponse('Could not load your video library.', 500);
}
