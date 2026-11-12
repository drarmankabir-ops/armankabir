# cPanel Deployment Guide

This document provides instructions for deploying the Dr. Arman Kabir's Care application on cPanel hosting.

## Prerequisites

- cPanel hosting with PHP 8+ and MySQL/MariaDB
- SSH access to your cPanel account
- Node.js 20+ and npm for building the React frontend only

## Production API Repair Checklist

PHP remains the API runtime and MySQL remains the application data store. Node.js is
used only to build the static frontend; do not configure a Node.js application for
API handling.

1. **Back up first.** Export the production database and copy the current
   `public_html` tree before deploying. Do not run a full schema initializer against
   an existing database or overwrite existing `site_settings` content.
2. **Confirm PHP runtime.** In cPanel, select PHP 8.1 or newer and enable
   `pdo_mysql`. From SSH, check `php -v` and `php -m`; the CLI version should match
   the cPanel web PHP version.
3. **Check configuration privately.** Ensure `public_html/config.php` or cPanel
   environment variables provide `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS`, and
   the existing `JWT_SECRET` required by the application.
   The PHP process must be able to read the config, and the MySQL user must be
   assigned to the intended database with runtime `SELECT`, `INSERT`, `UPDATE`,
   and `DELETE` privileges. Never place credentials in API output or logs.
4. **Inspect schema before migration.** In phpMyAdmin, check table and column
   existence using `information_schema`; the application has no separate
   `frontpage` table—front-page data is stored in `site_settings` and optional
   legacy `user_preferences`.

   ```sql
   SELECT TABLE_NAME
   FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME IN (
       'users', 'user_sessions', 'patients', 'patient_login',
       'patient_sessions', 'admin_accounts', 'admin_sessions',
       'audit_logs', 'site_settings', 'user_preferences',
       'classroom_students', 'classroom_courses',
       'classroom_enrollments', 'learning_videos'
     )
   ORDER BY TABLE_NAME;

   SELECT TABLE_NAME, COLUMN_NAME
   FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME IN ('site_settings', 'admin_accounts', 'admin_sessions',
                        'classroom_students', 'classroom_enrollments',
                        'classroom_courses', 'learning_videos')
   ORDER BY TABLE_NAME, ORDINAL_POSITION;
   ```

5. **Apply only missing migrations.** Back up again immediately before changes.
   The existing migrations are under `server-data/migrations/`: after the baseline
   schema, `003_auth_conversion.sql` creates patient/admin accounts and patient
   sessions; `008_create_site_settings_table.sql` creates `site_settings`;
   `009_admin_sessions.sql` creates content-admin sessions;
   `002_classroom_schema.sql` creates classroom tables; and
   `012_learning_video_library.sql` creates the video catalog. Apply in dependency
   order and only after checking each target object. In particular,
   `002_classroom_schema.sql` and the `ALTER TABLE` in `012_learning_video_library.sql`
   are not safe to rerun blindly. Do not seed, reset, or alter existing accounts.
6. **Keep diagnostics private.** PHP API errors are configured to go to
   `~/logs/php-error.log` when that directory is writable. Keep `logs/` outside
   `public_html`, owned by the cPanel account, with directory permissions no broader
   than `750` and log-file permissions no broader than `640`. Confirm PHP can append
   to the file; otherwise use cPanel's private PHP error log. Never enable
   `display_errors` in production.
7. **Deploy and smoke-test.** Build the frontend and upload its generated
   `index.html` and complete assets directory together with the PHP source.
   Do not upload only the renamed font files: the checked-in
   `public_html/index.html` can point at an older hashed CSS bundle with stale
   `.woff2` font paths. Then
   request the homepage, `/api/frontpage/get.php`, and
   `/api/learning-videos/list.php`. These public GET endpoints must return JSON
   (including an empty `videos` list where appropriate). Without a session,
   `/api/auth/verify.php`, `/api/auth/patients/verify.php`,
   `/api/classroom/auth/verify.php`, and `/api/auth/admin_verify.php` should return
   an authentication/role status (`401` or `403`), not `500`. For login testing,
   obtain a fresh CSRF token from `/api/auth/csrf.php` and use an approved account;
   do not test guessed credentials. Verify the resulting cookie, the corresponding
   role-specific verification endpoint, and logout. Review the private error log
   after each check.
8. **Verify font responses.** Confirm the active `/assets/fonts/*.ttf` files return
   HTTP 200 with `font/ttf`, and that the generated CSS references those deployed
   paths. The current font assets are TrueType files, not WOFF2 files.

## Deployment Steps

### 1. SSH into Your cPanel Server

```bash
ssh user@yourdomain.com
```

### 2. Clone or Upload Your Repository

```bash
cd ~/
git clone https://github.com/drarmankabir-ops/drarmankabir0.git
cd drarmankabir0
```

### 3. Run the Deployment Script

```bash
bash deploy.sh
```

The script installs frontend dependencies, builds the React application, and deploys static files. PHP APIs and MySQL remain the only application backend and primary storage.

### 4. Manual Steps in cPanel

1. Log into your cPanel account
2. Go to **File Manager**
3. Navigate to **public_html**
4. Verify that your built files are present
5. Go to **SSL/TLS Status** and install an SSL certificate (recommended)

### 5. Verify PHP and MySQL Configuration

Confirm the cPanel PHP version is 8 or newer and that the existing `public_html/config.php` points to the intended MySQL database. Do not configure a Node.js server for API handling.

## Secure Admin Setup

For a fresh database, apply the schema migrations first, then provision the first admin from SSH. The CLI script requires an email-style username, creates the system and content-admin records together, and generates a one-time password when `ADMIN_PASSWORD` is not supplied:

```bash
ADMIN_USERNAME='admin@example.com' ADMIN_DISPLAY_NAME='Administrator' php scripts/provision_admin.php
```

Store the generated password in an approved password manager. It is printed only once; there is no default username or password.

For an existing database, take a full MySQL backup using cPanel/phpMyAdmin **Export** before applying any migration. Then apply `server-data/migrations/011_disable_unchanged_seed_accounts.sql`; it deactivates only legacy seed accounts whose password hash is still unchanged and keeps their rows. Reset the chosen admin from SSH to generate a new password and revoke old sessions:

```bash
ADMIN_USERNAME='admin@example.com' php scripts/reset_admin_password.php
```

Do not run schema/account migrations against production without a verified backup. Admin password changes are also available while signed in through the content editor's Security tab.

## File Structure After Deployment

```
~/public_html/
├── index.html
├── .htaccess          # SPA routing and security headers
├── assets/            # Images and other assets
└── env.json           # Environment configuration
```

## Troubleshooting

### Issue: Build fails
- Ensure pnpm is installed: `npm install -g pnpm`
- Check Node.js version: `node --version` (should be v20+)
- Clear cache: `pnpm store prune`

### Issue: 404 errors on refresh
- Verify `.htaccess` is in public_html
- Check mod_rewrite is enabled in cPanel
- Restart Apache: cPanel → Restart Services

### Issue: Slow performance
- Enable GZIP compression (configured in .htaccess)
- Enable browser caching (configured in .htaccess)
- Minimize JavaScript and CSS
- Use CDN for static assets

## SSL/TLS Certificate

1. Go to cPanel → **SSL/TLS Status**
2. Click **Manage SSL sites**
3. Select your domain and install AutoSSL (free with cPanel)

## Update Application

To update your application:

```bash
cd ~/drarmankabir0
git pull origin main
bash deploy.sh
```

## Performance Optimization

### Enable Compression
The `.htaccess` file already includes GZIP compression configuration.

### Cache Static Assets
The `.htaccess` file includes cache expiry headers for optimal performance.

### Minimize Bundles
Ensure your frontend build process includes minification:
- CSS minification
- JavaScript minification
- Image optimization

## Support

For issues or questions:
1. Check cPanel error logs: **cPanel → Error Log**
2. Review application logs in `~/logs/`
3. Verify .htaccess syntax
4. Contact your hosting provider for cPanel-specific support

## Security Checklist

- [ ] SSL/TLS certificate installed and active
- [ ] .htaccess security headers in place
- [ ] Node modules not exposed in public_html
- [ ] MySQL backup verified before running migrations
- [ ] First admin provisioned through the CLI-only script
- [ ] Sensitive environment variables in .env (not in git)
- [ ] Regular backups enabled
- [ ] File permissions properly set (644 for files, 755 for directories)
