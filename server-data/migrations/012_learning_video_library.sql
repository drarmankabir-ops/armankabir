-- Shared YouTube video catalog for homepage education and future Classroom use.
-- MANUAL MIGRATION: back up the database, verify these objects are absent, and
-- apply this file once. This migration is intentionally never run by the app.

CREATE TABLE IF NOT EXISTS learning_videos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(120) NOT NULL,
    youtube_video_id CHAR(11) NOT NULL,
    youtube_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500) DEFAULT NULL,
    duration_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    access_type ENUM('free', 'paid') NOT NULL DEFAULT 'free',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    created_by BIGINT UNSIGNED DEFAULT NULL,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_learning_videos_public (is_published, deleted_at, access_type),
    INDEX idx_learning_videos_category (category),
    INDEX idx_learning_videos_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_video_purchases (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    video_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'BDT',
    provider VARCHAR(50) NOT NULL,
    provider_payment_id VARCHAR(191) DEFAULT NULL,
    payment_status ENUM('pending', 'verified', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    verified_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_video_payment_provider (provider, provider_payment_id),
    INDEX idx_video_purchase_user (user_id, payment_status),
    INDEX idx_video_purchase_video (video_id),
    CONSTRAINT fk_video_purchase_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_video_purchase_video FOREIGN KEY (video_id)
        REFERENCES learning_videos(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_video_grants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    video_id BIGINT UNSIGNED NOT NULL,
    grant_type ENUM('purchase', 'classroom_enrollment', 'admin') NOT NULL,
    source_type VARCHAR(40) NOT NULL,
    source_id BIGINT UNSIGNED NOT NULL,
    purchase_id BIGINT UNSIGNED DEFAULT NULL,
    status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
    valid_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_video_grant_source
        (user_id, video_id, grant_type, source_type, source_id),
    UNIQUE KEY uq_video_grant_purchase (purchase_id),
    INDEX idx_video_grant_user_status (user_id, status, valid_until),
    INDEX idx_video_grant_video (video_id),
    CONSTRAINT fk_video_grant_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_video_grant_video FOREIGN KEY (video_id)
        REFERENCES learning_videos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_video_grant_purchase FOREIGN KEY (purchase_id)
        REFERENCES learning_video_purchases(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS learning_video_progress (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    video_id BIGINT UNSIGNED NOT NULL,
    seconds_watched INT UNSIGNED NOT NULL DEFAULT 0,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    last_accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_learning_video_progress (user_id, video_id),
    CONSTRAINT fk_video_progress_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_video_progress_video FOREIGN KEY (video_id)
        REFERENCES learning_videos(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing Classroom lessons can point at the same video row. Progress remains
-- attached to the existing lesson/enrollment records; the shared video progress
-- table also supports the future standalone "My Videos" library.
ALTER TABLE classroom_lessons
    ADD COLUMN learning_video_id BIGINT UNSIGNED NULL,
    ADD INDEX idx_classroom_lessons_learning_video (learning_video_id),
    ADD CONSTRAINT fk_classroom_lessons_learning_video
        FOREIGN KEY (learning_video_id) REFERENCES learning_videos(id)
        ON DELETE SET NULL;
