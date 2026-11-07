<?php
/** Pure validation and response-shaping helpers for the learning video API. */

function learningVideoIdFromInput(mixed $value): ?string {
    if (!is_string($value)) {
        return null;
    }
    $value = trim($value);
    if (preg_match('/^[A-Za-z0-9_-]{11}$/', $value)) {
        return $value;
    }

    $parts = parse_url($value);
    if (!is_array($parts) || !isset($parts['host'])) {
        return null;
    }
    if (!in_array(strtolower((string) ($parts['scheme'] ?? '')), ['http', 'https'], true)
        || isset($parts['user'])
        || isset($parts['pass'])
        || isset($parts['port'])) {
        return null;
    }
    $host = strtolower($parts['host']);
    $allowedHosts = [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'youtu.be',
        'www.youtu.be',
    ];
    if (!in_array($host, $allowedHosts, true)) {
        return null;
    }

    $videoId = null;
    if ($host === 'youtu.be' || $host === 'www.youtu.be') {
        $videoId = trim((string) ($parts['path'] ?? ''), '/');
    } elseif (($parts['path'] ?? '') === '/watch') {
        parse_str((string) ($parts['query'] ?? ''), $query);
        $videoId = $query['v'] ?? null;
    } elseif (preg_match('~^/(?:embed|shorts|live)/([^/]+)$~', (string) ($parts['path'] ?? ''), $matches)) {
        $videoId = $matches[1];
    }

    return is_string($videoId) && preg_match('/^[A-Za-z0-9_-]{11}$/', $videoId)
        ? $videoId
        : null;
}

function learningVideoPublicFields(array $video): array {
    return [
        'id' => (int) $video['id'],
        'title' => $video['title'],
        'description' => $video['description'],
        'category' => $video['category'],
        'thumbnail_url' => $video['thumbnail_url'],
        'duration_seconds' => (int) $video['duration_seconds'],
        'access_type' => $video['access_type'],
        'price' => (float) $video['price'],
        'currency' => $video['currency'],
    ];
}
