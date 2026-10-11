-- Migration: Create user_preferences table
-- Server-backed replacement for browser localStorage.
--
-- Each row is owned by exactly one authenticated principal (staff user,
-- patient, or content admin). Keys are never shared across principals.
-- Authentication material is explicitly rejected by the API layer and must
-- remain in PHP sessions.

CREATE TABLE IF NOT EXISTS `user_preferences` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `owner_key` VARCHAR(191) NOT NULL,
    `pref_key` VARCHAR(191) NOT NULL,
    `pref_value` LONGTEXT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_owner_pref_key` (`owner_key`, `pref_key`),
    INDEX `idx_owner_key` (`owner_key`),
    INDEX `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
