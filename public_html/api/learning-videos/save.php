<?php
/** Create or update video metadata. Publication changes use the same validated write. */
require_once __DIR__ . '/common.php';

handleCors();
requireMethod('POST');
learningVideoAdmin();
requireCsrfToken();

$input = getJsonInput();
$id = array_key_exists('id', $input)
    ? filter_var($input['id'], FILTER_VALIDATE_INT)
    : null;
$titleInput = $input['title'] ?? '';
$descriptionInput = $input['description'] ?? '';
$categoryInput = $input['category'] ?? '';
$thumbnailInput = $input['thumbnail_url'] ?? '';
if (!is_string($titleInput) || !is_string($descriptionInput)
    || !is_string($categoryInput) || !is_string($thumbnailInput)) {
    errorResponse('Title, description, category, and thumbnail must be text values.', 422);
}
$title = trim($titleInput);
$description = trim($descriptionInput);
$category = trim($categoryInput);
$videoId = learningVideoIdFromInput($input['youtube_video_id'] ?? $input['youtube_url'] ?? null);
$thumbnailUrl = trim($thumbnailInput);
$duration = filter_var($input['duration_seconds'] ?? 0, FILTER_VALIDATE_INT);
$accessType = $input['access_type'] ?? 'free';
$price = filter_var($input['price'] ?? 0, FILTER_VALIDATE_FLOAT);
$currencyInput = $input['currency'] ?? 'BDT';
if (!is_string($currencyInput)) {
    errorResponse('Currency must be a three-letter code.', 422);
}
$currency = strtoupper(trim($currencyInput));
$published = filter_var($input['is_published'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);

if ($id === false || ($id !== null && $id < 1)) {
    errorResponse('Invalid video ID.', 422);
}
if ($title === '' || mb_strlen($title) > 255) {
    errorResponse('Title is required and must be 255 characters or fewer.', 422);
}
if ($category === '') {
    errorResponse('A category is required.', 422);
}
if (mb_strlen($description) > 10000 || mb_strlen($category) > 120) {
    errorResponse('Description or category is too long.', 422);
}
if ($videoId === null) {
    errorResponse('Enter a valid YouTube video ID or YouTube URL.', 422);
}
if ($thumbnailUrl !== '' && mb_strlen($thumbnailUrl) > 500) {
    errorResponse('Thumbnail URL must be 500 characters or fewer.', 422);
}
if ($thumbnailUrl !== '' && !str_starts_with($thumbnailUrl, '/') && !filter_var($thumbnailUrl, FILTER_VALIDATE_URL)) {
    errorResponse('Thumbnail must be an absolute URL or a site-relative path.', 422);
}
if (str_starts_with($thumbnailUrl, '//')) {
    errorResponse('Thumbnail URL must not be protocol-relative.', 422);
}
if ($thumbnailUrl !== '' && !str_starts_with($thumbnailUrl, '/')) {
    $thumbnailScheme = strtolower((string) parse_url($thumbnailUrl, PHP_URL_SCHEME));
    if (!in_array($thumbnailScheme, ['http', 'https'], true)) {
        errorResponse('Thumbnail URL must use HTTP or HTTPS.', 422);
    }
}
if ($duration === false || $duration < 0 || $duration > 86400) {
    errorResponse('Duration must be between 0 and 86400 seconds.', 422);
}
if (!is_string($accessType) || !in_array($accessType, ['free', 'paid'], true)
    || $price === false || $price < 0 || $price > 99999999.99) {
    errorResponse('Invalid access type or price.', 422);
}
if ($accessType === 'paid' && $price <= 0) {
    errorResponse('Paid videos must have a price greater than zero.', 422);
}
if (!preg_match('/^[A-Z]{3}$/', $currency) || $published === null) {
    errorResponse('Invalid currency or publication status.', 422);
}
if ($accessType === 'free') {
    $price = 0;
}

$user = getAuthUser();
$createdBy = ($user['session_type'] ?? '') === 'user' ? (int) $user['id'] : null;
$youtubeUrl = 'https://www.youtube.com/watch?v=' . $videoId;

try {
    $db = Database::getInstance();
    $values = [
        ':title' => $title,
        ':description' => $description,
        ':category' => $category,
        ':youtube_video_id' => $videoId,
        ':youtube_url' => $youtubeUrl,
        ':thumbnail_url' => $thumbnailUrl !== '' ? $thumbnailUrl : null,
        ':duration_seconds' => $duration,
        ':access_type' => $accessType,
        ':price' => $price,
        ':currency' => $currency,
        ':is_published' => $published ? 1 : 0,
    ];

    if ($id !== null) {
        $values[':id'] = $id;
        $stmt = $db->prepare(
            'UPDATE learning_videos SET title = :title, description = :description, '
            . 'category = :category, youtube_video_id = :youtube_video_id, youtube_url = :youtube_url, '
            . 'thumbnail_url = :thumbnail_url, duration_seconds = :duration_seconds, '
            . 'access_type = :access_type, price = :price, currency = :currency, '
            . 'is_published = :is_published WHERE id = :id AND deleted_at IS NULL'
        );
        $stmt->execute($values);
        if ($stmt->rowCount() === 0) {
            $exists = $db->prepare('SELECT 1 FROM learning_videos WHERE id = :id AND deleted_at IS NULL');
            $exists->execute([':id' => $id]);
            if (!$exists->fetchColumn()) {
                errorResponse('Video not found.', 404);
            }
        }
        successResponse(['id' => $id], 'Video saved');
    }

    $values[':created_by'] = $createdBy;
    $stmt = $db->prepare(
        'INSERT INTO learning_videos '
        . '(title, description, category, youtube_video_id, youtube_url, thumbnail_url, '
        . 'duration_seconds, access_type, price, currency, is_published, created_by) '
        . 'VALUES (:title, :description, :category, :youtube_video_id, :youtube_url, :thumbnail_url, '
        . ':duration_seconds, :access_type, :price, :currency, :is_published, :created_by)'
    );
    $stmt->execute($values);
    successResponse(['id' => (int) $db->lastInsertId()], 'Video created');
} catch (Throwable $e) {
    error_log('Learning video save error: ' . $e->getMessage());
    errorResponse('Could not save this video.', 500);
}
