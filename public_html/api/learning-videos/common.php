<?php
require_once __DIR__ . '/video_utils.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth/middleware.php';

function learningVideoUser(): array {
    $user = requireAuth();
    if (($user['session_type'] ?? '') !== 'user' || (int) ($user['id'] ?? 0) < 1) {
        errorResponse('A signed-in user account is required for video access.', 403);
    }
    return $user;
}

function learningVideoAdmin(): array {
    return requirePermission('manage_homepage_content');
}
