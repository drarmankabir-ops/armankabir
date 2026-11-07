<?php
/** Soft-delete a video while retaining purchase, grant, and progress history. */
require_once __DIR__ . '/common.php';

handleCors();
requireMethod('POST');
learningVideoAdmin();
requireCsrfToken();

$id = filter_var(getJsonInput()['id'] ?? null, FILTER_VALIDATE_INT);
if ($id === false || $id === null || $id < 1) {
    errorResponse('A valid video ID is required.', 422);
}

try {
    $stmt = Database::getInstance()->prepare(
        'UPDATE learning_videos SET is_published = 0, deleted_at = NOW() '
        . 'WHERE id = :id AND deleted_at IS NULL'
    );
    $stmt->execute([':id' => $id]);
    if ($stmt->rowCount() !== 1) {
        errorResponse('Video not found.', 404);
    }
    successResponse(['id' => $id], 'Video deleted');
} catch (Throwable $e) {
    error_log('Learning video delete error: ' . $e->getMessage());
    errorResponse('Could not delete this video.', 500);
}
