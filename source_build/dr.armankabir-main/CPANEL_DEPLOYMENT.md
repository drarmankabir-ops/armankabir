# cPanel Deployment Guide

This document provides instructions for deploying the Dr. Arman Kabir's Care application on cPanel hosting.

## Prerequisites

- cPanel hosting with PHP 8+ and MySQL/MariaDB
- SSH access to your cPanel account
- Node.js 20+ and npm for building the React frontend only

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
