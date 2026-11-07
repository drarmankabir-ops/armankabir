<?php
/** Public catalog metadata. YouTube IDs and URLs are never returned here. */
require_once __DIR__ . '/common.php';

handleCors();
requireMethod('GET');

try {
    $videos = Database::getInstance()->query(
        'SELECT id, title, description, category, thumbnail_url, duration_seconds, '
        . 'access_type, price, currency '
        . 'FROM learning_videos '
        . 'WHERE is_published = 1 AND deleted_at IS NULL '
        . 'ORDER BY created_at DESC, id DESC'
    )->fetchAll(PDO::FETCH_ASSOC);

    successResponse([
        'videos' => array_map('learningVideoPublicFields', $videos),
    ], 'Video catalog retrieved');
} catch (Throwable $e) {
    error_log('Learning video catalog error: ' . $e->getMessage());
    errorResponse('Could not load the video catalog.', 500);
}
