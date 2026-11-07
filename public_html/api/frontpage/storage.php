<?php
/**
 * Shared persistence helpers for front-page content.
 */

function defaultFrontPageConfig(): array
{
    return [
        'heroSection' => [
            'taglineEn' => 'Dr. Arman Kabir Care',
            'taglineBn' => 'ডা. আরমান কবির কেয়ার',
            'subheadingEn' => 'Consultation and patient care',
            'subheadingBn' => 'চিকিৎসা পরামর্শ ও রোগীসেবা',
            'heroTaglineEn' => '',
            'heroTaglineBn' => '',
            'heroDescriptionEn' => '',
            'heroDescriptionBn' => '',
            'cta1Label' => 'Book Appointment',
            'cta1LabelBn' => 'অ্যাপয়েন্টমেন্ট নিন',
            'cta2Label' => 'Emergency',
            'cta2LabelBn' => 'জরুরি যোগাযোগ',
        ],
        'aboutSection' => [
            'visible' => false,
            'clinicNameEn' => 'Dr. Arman Kabir Care',
            'clinicNameBn' => 'ডা. আরমান কবির কেয়ার',
            'descriptionEn' => '',
            'descriptionBn' => '',
            'yearsExperience' => 0,
            'patientCount' => '',
            'doctorCount' => 0,
            'specialties' => [],
            'specialtiesBn' => [],
            'affiliations' => [],
            'affiliationsBn' => [],
        ],
        'footerSection' => [
            'addressEn' => '',
            'addressBn' => '',
            'phone' => '',
            'email' => '',
            'openingHours' => '',
            'openingHoursBn' => '',
            'copyrightText' => 'Dr. Arman Kabir Care',
            'copyrightTextBn' => 'ডা. আরমান কবির কেয়ার',
            'socialLinks' => [],
        ],
        'emergencyContacts' => [],
        'testimonialsSection' => [
            'heading' => 'Patient Feedback',
            'headingBn' => 'রোগীদের মতামত',
            'testimonials' => [],
        ],
        'gallerySection' => [
            'heading' => 'Clinic Gallery',
            'headingBn' => 'ক্লিনিক গ্যালারি',
            'photos' => [],
        ],
        'faqsSection' => [
            'heading' => 'Frequently Asked Questions',
            'headingBn' => 'সাধারণ জিজ্ঞাসা',
            'faqs' => [],
        ],
        'doctorContentOverrides' => [],
    ];
}

function decodeFrontPageSetting(?string $value, string $key): array
{
    if ($value === null || $value === '') {
        return [];
    }

    try {
        $decoded = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        error_log('Invalid JSON in site_settings.' . $key . ': ' . $e->getMessage());
        return [];
    }

    if (!is_array($decoded)) {
        error_log('Unexpected JSON type in site_settings.' . $key);
        return [];
    }

    return $decoded;
}

function mergeFrontPageContent(mixed $current, mixed $patch): mixed
{
    if (!is_array($current) || !is_array($patch)) {
        return $patch;
    }

    $currentIsObject = !frontPageIsList($current) || $current === [];
    $patchIsObject = !frontPageIsList($patch) || $patch === [];
    if (!$currentIsObject || !$patchIsObject) {
        return $patch;
    }

    foreach ($patch as $key => $value) {
        $current[$key] = array_key_exists($key, $current)
            ? mergeFrontPageContent($current[$key], $value)
            : $value;
    }

    return $current;
}

function frontPageIsList(array $value): bool
{
    $expectedKey = 0;
    foreach ($value as $key => $_) {
        if ($key !== $expectedKey) {
            return false;
        }
        $expectedKey++;
    }

    return true;
}

/**
 * Read the canonical rows and fold in legacy combined data without allowing
 * stale combined data to override newer per-section records.
 */
function loadFrontPageContent(PDO $db): array
{
    $stmt = $db->prepare(
        "SELECT setting_key, setting_value, setting_group FROM site_settings
         WHERE setting_key IN ('siteConfig', 'doctorContentOverrides', 'frontPageContent')
            OR setting_group = 'home'"
    );
    $stmt->execute();

    $settings = [];
    $legacyHomeContent = [];
    foreach ($stmt->fetchAll() as $row) {
        if ($row['setting_group'] === 'home') {
            $key = (string) $row['setting_key'];
            try {
                $value = json_decode($row['setting_value'], true, 512, JSON_THROW_ON_ERROR);
            } catch (JsonException $e) {
                error_log('Invalid legacy home setting ' . $key . ': ' . $e->getMessage());
                continue;
            }

            if (in_array($key, ['heroSection', 'aboutSection', 'footerSection'], true)) {
                if (is_array($value)) {
                    $legacyHomeContent[$key] = $value;
                }
            } elseif (preg_match('/^(hero|about|footer|emergency)[A-Z]/', $key, $matches)) {
                $section = strtolower($matches[1]) . 'Section';
                $legacyHomeContent[$section][$key] = $value;
            }
        }

        if (!in_array($row['setting_key'], ['siteConfig', 'doctorContentOverrides', 'frontPageContent'], true)) {
            continue;
        }
        $settings[$row['setting_key']] = decodeFrontPageSetting(
            $row['setting_value'],
            $row['setting_key']
        );
    }

    $combined = $settings['frontPageContent'] ?? [];
    if (isset($combined['siteConfig']) && is_array($combined['siteConfig'])) {
        $extraCombinedContent = $combined;
        unset(
            $extraCombinedContent['siteConfig'],
            $extraCombinedContent['doctorContentOverrides'],
            $extraCombinedContent['updated_at']
        );
        $legacyConfig = mergeFrontPageContent(
            $extraCombinedContent,
            $combined['siteConfig']
        );
    } else {
        $legacyConfig = $combined;
    }
    unset(
        $legacyConfig['siteConfig'],
        $legacyConfig['doctorContentOverrides'],
        $legacyConfig['updated_at']
    );

    $legacyConfig = mergeFrontPageContent($legacyHomeContent, $legacyConfig);
    $siteConfig = mergeFrontPageContent(
        defaultFrontPageConfig(),
        mergeFrontPageContent($legacyConfig, $settings['siteConfig'] ?? [])
    );
    $doctorOverrides = mergeFrontPageContent(
        $combined['doctorContentOverrides'] ?? ($siteConfig['doctorContentOverrides'] ?? []),
        $settings['doctorContentOverrides'] ?? []
    );
    unset($siteConfig['doctorContentOverrides']);

    $legacyTestimonials = [];
    if (isset($siteConfig['testimonials']) && is_array($siteConfig['testimonials'])) {
        $legacyTestimonials['testimonials'] = $siteConfig['testimonials'];
        unset($siteConfig['testimonials']);
    }
    if (isset($siteConfig['testimonialsHeading']) && is_string($siteConfig['testimonialsHeading'])) {
        $legacyTestimonials['heading'] = $siteConfig['testimonialsHeading'];
        unset($siteConfig['testimonialsHeading']);
    }
    if ($legacyTestimonials !== []) {
        $siteConfig['testimonialsSection'] = mergeFrontPageContent(
            $legacyTestimonials,
            is_array($siteConfig['testimonialsSection'] ?? null)
                ? $siteConfig['testimonialsSection']
                : []
        );
    }

    return [
        'siteConfig' => $siteConfig,
        'doctorContentOverrides' => $doctorOverrides,
    ];
}

function saveFrontPageSetting(PDO $db, string $key, array $value, ?int $userId): void
{
    $encoded = json_encode(
        $value,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    );

    $stmt = $db->prepare(
        'INSERT INTO site_settings
            (setting_key, setting_value, setting_group, description, updated_by, updated_at)
         VALUES
            (:key, :value, \'frontpage\', :description, :user_id, NOW())
         ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            setting_group = VALUES(setting_group),
            updated_by = VALUES(updated_by),
            updated_at = NOW()'
    );
    $stmt->execute([
        ':key' => $key,
        ':value' => $encoded,
        ':description' => match ($key) {
            'siteConfig' => 'Site configuration for landing page',
            'doctorContentOverrides' => 'Doctor content overrides for landing page',
            default => 'Front-page migration status',
        },
        ':user_id' => $userId,
    ]);
}

/**
 * One-time, non-destructive migration from legacy preferences to site_settings.
 */
function migrateLegacyFrontPageContent(PDO $db, array $user, array $content): array
{
    $sessionType = (string) ($user['session_type'] ?? '');
    $userId = (int) ($user['id'] ?? 0);
    if ($userId <= 0) {
        return $content;
    }

    try {
        $db->beginTransaction();
        $userIdForDb = $sessionType === 'user' ? $userId : null;
        $claimMigration = $db->prepare(
            "INSERT IGNORE INTO site_settings
                (setting_key, setting_value, setting_group, description, updated_by, updated_at)
             VALUES
                ('frontPageLegacyMigrationV1', 'true', 'frontpage',
                 'Front-page migration status', :user_id, NOW())"
        );
        $claimMigration->execute([':user_id' => $userIdForDb]);
        if ($claimMigration->rowCount() === 0) {
            $db->commit();
            return $content;
        }

        $legacyConfig = [];
        $legacyOverrides = [];
        $legacyTestimonials = [];
        $preferencesTable = $db->prepare(
            "SELECT COUNT(*) FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_preferences'"
        );
        $preferencesTable->execute();
        if ((int) $preferencesTable->fetchColumn() > 0) {
            $stmt = $db->prepare(
                'SELECT owner_key, pref_key, pref_value
                 FROM user_preferences
                 WHERE pref_key IN (:site_config_key, :doctor_overrides_key, :testimonials_key,
                                    :heading_key, :gallery_photos_key, :gallery_heading_key)
                   AND owner_key IN (:shared_owner, :current_owner)
                 ORDER BY CASE WHEN owner_key = :shared_owner_order THEN 0 ELSE 1 END'
            );
            $currentOwner = $sessionType . ':' . $userId;
            $stmt->execute([
                ':site_config_key' => 'siteConfig',
                ':doctor_overrides_key' => 'doctorContentOverrides',
                ':testimonials_key' => 'testimonials',
                ':heading_key' => 'testimonialsHeading',
                ':gallery_photos_key' => 'galleryPhotos',
                ':gallery_heading_key' => 'galleryHeading',
                ':shared_owner' => 'clinic:1',
                ':current_owner' => $currentOwner,
                ':shared_owner_order' => 'clinic:1',
            ]);
        }

        foreach (isset($stmt) ? $stmt->fetchAll() : [] as $row) {
            $key = (string) $row['pref_key'];
            if ($key === 'testimonialsHeading' || $key === 'galleryHeading') {
                $heading = json_decode((string) $row['pref_value'], true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    $heading = $row['pref_value'];
                }
                if (is_string($heading) && trim($heading) !== '') {
                    if ($key === 'testimonialsHeading') {
                        $legacyTestimonials['heading'] = trim($heading);
                    } else {
                        $legacyConfig['gallerySection']['heading'] = trim($heading);
                    }
                }
                continue;
            }

            $decoded = json_decode((string) $row['pref_value'], true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($decoded)) {
                continue;
            }

            if ($key === 'siteConfig') {
                $legacyConfig = mergeFrontPageContent($legacyConfig, $decoded);
            } elseif ($key === 'doctorContentOverrides') {
                $legacyOverrides = mergeFrontPageContent($legacyOverrides, $decoded);
            } elseif ($key === 'testimonials') {
                $legacyTestimonials['testimonials'] = $decoded;
            } elseif ($key === 'galleryPhotos') {
                $legacyConfig['gallerySection']['photos'] = $decoded;
            }
        }

        if (isset($legacyConfig['doctorContentOverrides']) && is_array($legacyConfig['doctorContentOverrides'])) {
            $legacyOverrides = mergeFrontPageContent(
                $legacyOverrides,
                $legacyConfig['doctorContentOverrides']
            );
            unset($legacyConfig['doctorContentOverrides']);
        }
        if (isset($legacyConfig['testimonials']) && is_array($legacyConfig['testimonials'])) {
            $legacyTestimonials['testimonials'] ??= $legacyConfig['testimonials'];
            unset($legacyConfig['testimonials']);
        }
        if (isset($legacyConfig['testimonialsHeading']) && is_string($legacyConfig['testimonialsHeading'])) {
            $legacyTestimonials['heading'] ??= $legacyConfig['testimonialsHeading'];
            unset($legacyConfig['testimonialsHeading']);
        }
        if ($legacyTestimonials !== []) {
            $legacyConfig['testimonialsSection'] = mergeFrontPageContent(
                $legacyTestimonials,
                is_array($legacyConfig['testimonialsSection'] ?? null)
                    ? $legacyConfig['testimonialsSection']
                    : []
            );
        }

        $current = loadFrontPageContent($db);
        $siteConfig = mergeFrontPageContent($legacyConfig, $current['siteConfig']);
        $doctorOverrides = mergeFrontPageContent(
            $legacyOverrides,
            $current['doctorContentOverrides']
        );

        if ($siteConfig !== []) {
            saveFrontPageSetting($db, 'siteConfig', $siteConfig, $userIdForDb);
        }
        if ($doctorOverrides !== []) {
            saveFrontPageSetting($db, 'doctorContentOverrides', $doctorOverrides, $userIdForDb);
        }

        $db->commit();
        return [
            'siteConfig' => $siteConfig,
            'doctorContentOverrides' => $doctorOverrides,
        ];
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Legacy front-page migration unavailable: ' . $e->getMessage());
        throw $e;
    }
}
