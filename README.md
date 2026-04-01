# Fayette County Public Libraries — Website & Staff Portal

A fully self-hosted modern website for [fayette.lib.wv.us](https://fayette.lib.wv.us/), served via Docker + Nginx.  
No frameworks, no build tools, no API keys required. Staff manage all content through a browser-based admin portal.

**WCAG 2.1 AA compliant** — designed for children, elderly, and users with disabilities.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [First-Time Setup](#2-first-time-setup)
3. [Daily Staff Usage](#3-daily-staff-usage)
4. [Admin Portal Guide](#4-admin-portal-guide)
5. [Security](#5-security)
6. [Backups & Recovery](#6-backups--recovery)
7. [Changing Passwords](#7-changing-passwords)
8. [Site Structure](#8-site-structure)
9. [Updating the Site (Dev)](#9-updating-the-site-dev)
10. [Debugging Common Problems](#10-debugging-common-problems)
11. [Security Hardening Reference](#11-security-hardening-reference)
12. [FAQ](#12-faq)

---

## 1. Quick Start

```bash
# Clone the repo (first time only)
cd /home/kevin/Projects/fayette_lib

# Start everything
sudo docker-compose up -d

# Open the website
xdg-open http://localhost:8080

# Open the staff admin portal
xdg-open http://localhost:8080/admin/
```

Stop: `sudo docker-compose down`  
Rebuild after code changes: `sudo docker-compose up -d --build`

> **Docker permission error?** Run `sudo usermod -aG docker $USER` then log out and back in.

---

## 2. First-Time Setup

### Requirements
- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- That's it — no Node.js, Python, or npm needed on the host machine.

### Step 1 — Set your admin password

```bash
# Generate a bcrypt hash of your chosen password (replace YOUR_PASSWORD)
sudo docker run --rm node:20-alpine node -e \
  "require('bcryptjs').hash('YOUR_PASSWORD', 12).then(h => console.log(h))"
```

Copy the output (starts with `$2a$12$...`).

Open `admin/.env` and paste it:

```dotenv
STAFF_PASSWORD_HASH=$2a$12$...paste-your-hash-here...

# Also generate a new JWT secret (run this to get one):
# openssl rand -hex 48
JWT_SECRET=replace-this-with-a-long-random-string-at-least-48-chars
```

### Step 2 — Start the containers

```bash
sudo docker-compose up -d
```

First run takes ~30 seconds to build. After that, starts in ~3 seconds.

### Step 3 — Log into the admin portal

Go to `http://localhost:8080/admin/` and enter your password.  
The session lasts 8 hours, then you'll need to log in again.

---

## 3. Daily Staff Usage

All content is managed at `http://localhost:8080/admin/`. No coding needed.

### Adding an Event (Calendar)
1. Click **📅 Events** tab
2. Click **+ Add Event**
3. Fill in title, date, time, location, category, description
4. Optionally upload a photo
5. Click **Save** — event appears on the public calendar immediately

### Adding an Announcement
1. Click **📢 Announcements** tab
2. Click **+ Add Announcement**
3. Fill in title, body text, optional link
4. Click **Save** — appears in the homepage sidebar immediately

### Editing Branch Hours
1. Click **🕒 Branch Hours** tab
2. Click **Edit Hours** next to the branch
3. Update the hours rows — click **+Row** to add entries, trash icon to remove
4. Click **Save** — live immediately

### Setting Holiday Closures
1. Click **🕒 Branch Hours** tab, scroll to **Holiday Closures** card
2. Check the holidays when the library will be closed
3. Add any notes in the text field
4. Click **Save Holiday Closures**

### Managing Digital Resources / Programs
- **🌐 Digital Resources** tab → Add / Edit / Delete database and website links
- **📚 Programs** tab → Edit storytime schedules, book club info, Library Chef

### Homepage Images
- **🖼️ Images** tab → Upload slider photos and featured event cards
- Images auto-resize via CSS; keep originals under 1 MB for performance

---

## 4. Admin Portal Guide

| Tab | What you can do |
|-----|----------------|
| 📅 Events | Add/edit/delete calendar events, upload event photos |
| 📢 Announcements | Manage homepage sidebar announcements |
| 🕒 Branch Hours | Edit hours for all 5 branches, holiday closures |
| 📚 Programs | Storytime schedules, adult book club, Library Chef |
| 🌐 Digital Resources | Manage database/website links |
| 📊 Analytics | View page-view stats |
| ⚡ System | Server health, restart signal |
| ⚙️ Settings | Site name, phone, social links |
| 📆 Calendars | Manage shareable calendar feeds |
| 🏠 Hosting Info | DNS, SSL, server IP records |
| 👥 Staff | Director, assistant, bookmobile staff names |
| 🖼️ Images | Homepage slider and featured photos |
| 🗑️ Recycle Bin | Restore recently deleted items (60-day window) |
| 🔍 Activity Log | See every change made — who, when, what |
| 💾 Backups | Browse and restore automatic data backups |

### Recycle Bin
- Items deleted from Events, Announcements, Programs, Resources, and Images go here automatically
- Items are kept for **60 days**, then permanently removed
- Click **Restore** to put an item back into its original tab
- Click **Delete Forever** to remove it permanently now

### Activity Log
- Records every save/delete action with timestamp and IP address
- Useful if something gets accidentally deleted or changed
- Last 500 actions retained
- Delete actions are highlighted in red

### Backups
- A snapshot of `events.json` or `content.json` is automatically saved **before every destructive change**
- Up to 20 backups kept per file
- Click **Restore** to roll back to any backup
- Restoring also creates a backup of current state first (so you can undo the restore)

---

## 5. Security

This site has multiple layers of protection:

### What protects it from outside attackers:

| Layer | Protection |
|-------|-----------|
| Nginx rate limiting | Login: 5 attempts/min per IP; API: 30 writes/min; General: 120 req/min |
| Express rate limiting | Login: 10 attempts/15 min; API: 200 req/15 min; Writes: 60 writes/15 min |
| JWT sessions | 8-hour expiry; HS256 signed; secret required in `.env` |
| bcrypt passwords | 12 rounds; constant-time comparison; 128-char input cap |
| Helmet.js | 12 security response headers including CSP, HSTS, X-Frame-Options |
| Input sanitization | All inputs truncated and stripped — no raw HTML/SQL ever stored |
| Atomic file writes | Write-to-temp then rename — no partial/corrupt JSON on crash |
| Path traversal prevention | All file paths checked against DATA_DIR before access |
| MIME-type checking | Image uploads validated by MIME type and size (5 MB cap) |
| Random filenames | Uploaded images get random names — no guessable URLs |

### What protects it from malicious staff:

| Feature | How it helps |
|---------|-------------|
| **Activity Log** | Every change is recorded with timestamp and IP — accountability |
| **Auto-Backup** | Snapshot taken before every destructive write — easy recovery |
| **Recycle Bin** | Deletes are soft — items recoverable for 60 days |
| **Write rate limit** | 60 writes/15 min max — prevents bulk deletion rampage |
| **No server access needed** | Staff use the portal only — they can't touch raw JSON or server files |
| **Single admin password** | Change the password at any time to lock out a departing employee |

### Changing the password for a departed employee:
See [Section 7 — Changing Passwords](#7-changing-passwords).

---

## 6. Backups & Recovery

### Automatic backups
Every time staff save changes that affect `events.json` or `content.json`, a timestamped backup is saved to:
```
site/data/backups/
```

You can also see and restore backups from the **💾 Backups** tab in the admin portal.

### Manual backup (full data export)
```bash
# Copy all data files to a safe location
cp -r /home/kevin/Projects/fayette_lib/site/data/ ~/fcpl-backup-$(date +%Y%m%d)/
```

### Restoring from a backup via terminal
```bash
# List available backups
ls /home/kevin/Projects/fayette_lib/site/data/backups/

# Restore events (example)
cp site/data/backups/events_2026-03-31T14-22-00.json site/data/events.json

# Restore content (example)
cp site/data/backups/content_2026-03-31T09-15-00.json site/data/content.json
```
No restart needed — changes are live immediately.

### Restoring via the admin portal
1. Log into the admin portal
2. Click **💾 Backups** tab
3. Find the backup you want and click **Restore**

---

## 7. Changing Passwords

**Always change the password when a staff member with portal access leaves.**

```bash
# Step 1: Generate a new bcrypt hash
sudo docker run --rm node:20-alpine node -e \
  "require('bcryptjs').hash('NEW_PASSWORD_HERE', 12).then(h => console.log(h))"

# Step 2: Open admin/.env and replace the hash
nano /home/kevin/Projects/fayette_lib/admin/.env

# Step 3: Restart the admin container to pick up the new password
sudo docker-compose restart fcpl-admin
```

The new password is active within seconds. All existing sessions (JWT tokens) remain valid for up to 8 hours — to invalidate all sessions immediately, also change `JWT_SECRET` in `.env` and restart.

---

## 8. Site Structure

```
fayette_lib/
├── README.md                    ← This file
├── docker-compose.yml           ← Starts both containers
├── admin/
│   ├── .env                     ← ⚠️  PASSWORDS — never commit to git
│   ├── server.js                ← Node.js/Express backend API
│   ├── package.json
│   ├── Dockerfile
│   └── public/
│       └── index.html           ← Staff portal single-page app
├── docker/
│   ├── Dockerfile               ← Nginx image
│   ├── nginx.conf               ← Web server config + security headers
│   ├── docker-entrypoint.sh
│   └── certs/                   ← Self-signed SSL cert (HTTPS on port 8443)
├── site/
│   ├── index.html               ← Homepage
│   ├── pages/                   ← All other pages
│   ├── css/style.css            ← All styles — edit to change colors/fonts
│   ├── js/
│   │   ├── a11y.js              ← Accessibility toolbar
│   │   ├── calendar.js          ← Public calendar widget
│   │   └── main.js              ← Content loading, nav, tabs
│   ├── images/                  ← Logo, photos, event images
│   └── data/
│       ├── events.json          ← ← All calendar events
│       ├── content.json         ← ← All site content (branches, programs, etc.)
│       └── backups/             ← Auto-generated backups (don't delete)
└── docs/
    └── site-audit.md            ← Original site audit
```

**The two files staff need to know about:**
- `site/data/events.json` — calendar events (editable via admin portal or directly)
- `site/data/content.json` — everything else: branches, hours, announcements, programs, staff, resources

---

## 9. Updating the Site (Dev)

### After editing HTML, CSS, or JavaScript files:
```bash
sudo docker-compose up -d --build
```

### After editing `site/data/events.json` or `site/data/content.json` directly:
No rebuild needed — changes are live immediately (volume-mounted).

### After editing `admin/server.js` or `admin/public/index.html`:
```bash
sudo docker-compose up -d --build
```

### Updating branch coordinates (map location) in `site/pages/locations.html`:
1. Look up the address on [nominatim.openstreetmap.org](https://nominatim.openstreetmap.org/)
2. Find the `BRANCHES` object in the `<script>` at the bottom of `locations.html`
3. Update `lat` and `lng` for the branch
4. Rebuild: `sudo docker-compose up -d --build`

### Changing the color theme:
Open `site/css/style.css` and edit the CSS variables at the top of `:root { ... }`.  
Then rebuild.

---

## 10. Debugging Common Problems

### Site won't start
```bash
# Check container status
sudo docker ps

# View logs
sudo docker-compose logs fcpl-website
sudo docker-compose logs fcpl-admin

# Rebuild from scratch
sudo docker-compose down
sudo docker-compose up -d --build
```

### Admin portal shows "Authentication required" / login loop
- Check that `admin/.env` exists and has valid `STAFF_PASSWORD_HASH` and `JWT_SECRET`
- Password hash must start with `$2a$12$`
- JWT_SECRET must be at least 32 characters
- Restart the admin container: `sudo docker-compose restart fcpl-admin`

### Admin portal buttons not working (edit/delete do nothing)
- Usually a Content Security Policy issue. Check the browser console (F12 → Console) for CSP errors.
- Make sure `docker/nginx.conf` has `'unsafe-inline'` in `script-src` for the admin path — the Helmet config in `admin/server.js` handles the admin CSP.

### Calendar not showing events
- Check that `site/data/events.json` exists and is valid JSON: `python3 -m json.tool site/data/events.json`
- Events must have `"id"`, `"title"`, and `"start"` fields at minimum
- Date format: `"2026-06-01T10:00:00"` (ISO 8601, no timezone offset)

### Map showing wrong location
1. Look up the correct coordinates at [nominatim.openstreetmap.org](https://nominatim.openstreetmap.org/)
2. Edit the `BRANCHES` object in `site/pages/locations.html`
3. Rebuild

### Images not uploading
- Check file size — max 5 MB
- Accepted formats: JPEG, PNG, GIF, WebP
- Check disk space: `df -h`
- Check container logs: `sudo docker-compose logs fcpl-admin`

### "Too many requests" error in admin portal
- You're hitting the rate limit (60 write operations per 15 minutes per IP)
- Wait 15 minutes and try again
- This is intentional security — prevents bulk damage

### Content changes not saving
- Check the browser console for 401 (log in again) or 500 (server error) responses
- Check server logs: `sudo docker-compose logs fcpl-admin`

### Recycle Bin not showing deleted items
- Items move to the bin for: Events, Announcements, Programs (storytimes/lapsit), Digital Resources, Homepage Images
- Branch hours, site settings, staff info are replaced (not soft-deleted) — back up before major changes
- Bin items expire after 60 days

### How to view the audit log from the terminal
```bash
cat site/data/audit_log.json | python3 -m json.tool | head -100
```

---

## 11. Security Hardening Reference

### Headers sent on every response (Nginx):
| Header | Value |
|--------|-------|
| `X-Frame-Options` | `SAMEORIGIN` — prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` — prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera/mic/payment blocked; geolocation only for location maps |
| `X-DNS-Prefetch-Control` | `off` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Content-Security-Policy` | Restricts scripts, styles, images to trusted origins |

### Admin backend additional headers (Helmet.js):
| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | 1-year HSTS, includeSubDomains |
| `X-Frame-Options` | `DENY` — stricter for admin |
| `Content-Security-Policy` | Admin-specific; blocks all external CDNs |

### Rate limits (combined Nginx + Express layers):
| Endpoint | Nginx limit | Express limit |
|----------|-------------|---------------|
| Login (`/admin/api/auth/login`) | 5 req/min, burst 3 | 10 req/15 min |
| Admin API writes | 30 req/min, burst 10 | 60 req/15 min |
| All admin API | — | 200 req/15 min |
| Public site (general) | 120 req/min, burst 30 | — |

### What is NOT protected (known limitations):
- **No per-user accounts** — all staff share one password. If one staff member is a bad actor, they cannot be individually locked out without changing the shared password. This is intentional simplicity — the Activity Log provides accountability.
- **No TOTP/2FA** — consider adding if high-risk staff access is a concern
- **Local deployment only** — the SSL cert is self-signed. For production internet exposure, replace with a Let's Encrypt cert via Certbot.

---

## 12. FAQ

**Q: How do I add a new branch?**  
A: Go to admin → **🕒 Branch Hours** tab → scroll to the bottom and click **+ Add Branch**. Fill in all fields and save.

**Q: Can I restore something I deleted by mistake?**  
A: Yes — go to the **🗑️ Recycle Bin** tab. Items are kept for 60 days. Click Restore.

**Q: How do I close the library for a holiday?**  
A: Two ways: (1) Check the holiday in the **Holiday Closures** section of the Branch Hours tab, or (2) add a calendar event with category `closure` — it shows on the calendar so patrons know the library is closed.

**Q: A staff member left — how do I prevent them from accessing the portal?**  
A: Change the admin password. See [Section 7](#7-changing-passwords). Takes effect immediately.

**Q: How do I see what a staff member changed?**  
A: Go to the **🔍 Activity Log** tab. Every save/delete action is logged with IP address and timestamp.

**Q: The site looks broken after I edited something — how do I undo it?**  
A: Go to the **💾 Backups** tab and restore the most recent backup before your change. Or from the terminal: copy the appropriate file from `site/data/backups/`.

**Q: How do I move this to a real web server?**  
A: 1) Copy the whole project directory to the server. 2) Install Docker. 3) Run `docker-compose up -d`. 4) Point your domain DNS to the server IP. 5) Replace the self-signed cert in `docker/certs/` with a Let's Encrypt cert. 6) Set `HSTS preload: true` in `admin/server.js` once HTTPS is confirmed working.

**Q: How do I back up the whole site?**  
A: `cp -r site/data/ ~/fcpl-backup-$(date +%Y%m%d)/` — saves all event and content JSON. The rest of the site is in git.

**Q: Can I access the admin portal from another computer?**  
A: Yes — if the server is accessible on the network, go to `http://SERVER_IP:8080/admin/`. Make sure the server firewall allows port 8080 from your network.

---

*Built for Fayette County Public Libraries — all content belongs to FCPL.*
