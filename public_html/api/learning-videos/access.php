<?php
/** Return a YouTube embed ID only for a free published video or authorized user. */
require_once __DIR__ . '/common.php';

handleCors();
requireMethod('GET');

$id = filter_var(getParam('id'), FILTER_VALIDATE_INT);
if ($id === false || $id === null || $id < 1) {
    errorResponse('A valid video ID is required.', 422);
}

try {
    $db = Database::getInstance();
    $videoStmt = $db->prepare(
        'SELECT id, title, description, category, youtube_video_id, thumbnail_url, '
        . 'duration_seconds, access_type, price, currency '
        . 'FROM learning_videos WHERE id = :id AND is_published = 1 AND deleted_at IS NULL'
    );
    $videoStmt->execute([':id' => $id]);
    $video = $videoStmt->fetch(PDO::FETCH_ASSOC);
    if (!$video) {
        errorResponse('Video not found.', 404);
    }

    if ($video['access_type'] === 'paid') {
        $user = learningVideoUser();
        $accessStmt = $db->prepare(
            'SELECT 1 FROM learning_video_grants g '
            . 'LEFT JOIN learning_video_purchases p ON p.id = g.purchase_id '
            . 'WHERE g.user_id = :user_id AND g.video_id = :video_id AND g.status = "active" '
            . 'AND g.valid_from <= NOW() AND (g.valid_until IS NULL OR g.valid_until > NOW()) '
            . 'AND (g.grant_type = "classroom_enrollment" OR (g.grant_type = "purchase" '
            . 'AND p.payment_status = "verified" AND p.user_id = g.user_id '
            . 'AND p.video_id = g.video_id)) LIMIT 1'
        );
        $accessStmt->execute([
            ':user_id' => (int) $user['id'],
            ':video_id' => $id,
        ]);
        if (!$accessStmt->fetchColumn()) {
            errorResponse('Verified payment or an active Classroom enrollment is required.', 403);
        }
    }

    successResponse([
        'video' => [
            'id' => (int) $video['id'],
            'title' => $video['title'],
            'description' => $video['description'],
            'youtube_video_id' => $video['youtube_video_id'],
            'thumbnail_url' => $video['thumbnail_url'],
            'duration_seconds' => (int) $video['duration_seconds'],
        ],
    ], 'Video access granted');
} catch (Throwable $e) {
    error_log('Learning video access error: ' . $e->getMessage());
    errorResponse('Could not authorize video access.', 500);
}
