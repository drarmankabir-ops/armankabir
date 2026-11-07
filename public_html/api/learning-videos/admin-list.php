<?php
/** List video records for users with homepage-content permission. */
require_once __DIR__ . '/common.php';

handleCors();
requireMethod('GET');
learningVideoAdmin();

try {
    $stmt = Database::getInstance()->query(
        'SELECT id, title, description, category, youtube_video_id, youtube_url, '
        . 'thumbnail_url, duration_seconds, access_type, price, currency, is_published, '
        . 'created_at, updated_at '
        . 'FROM learning_videos WHERE deleted_at IS NULL ORDER BY updated_at DESC, id DESC'
    );
    successResponse(['videos' => $stmt->fetchAll(PDO::FETCH_ASSOC)], 'Videos retrieved');
} catch (Throwable $e) {
    error_log('Learning video admin list error: ' . $e->getMessage());
    errorResponse('Could not load video records.', 500);
}
