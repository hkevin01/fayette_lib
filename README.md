# Fayette County Public Libraries — Website & Staff Portal

> **Self-hosted. Zero dependencies on the host. No frameworks. No API keys. No CMS subscriptions.**
> A production-grade public library website + staff content management portal serving Fayette County, West Virginia.

[![Docker](https://img.shields.io/badge/Docker-29.3+-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Nginx](https://img.shields.io/badge/Nginx-Alpine-009639?logo=nginx&logoColor=white)](https://nginx.org/)
[![WCAG 2.1 AA](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-005A9C)](https://www.w3.org/TR/WCAG21/)
[![OWASP](https://img.shields.io/badge/Security-OWASP_Top_10-A41E11)](https://owasp.org/www-project-top-ten/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Quick Start](#5-quick-start)
6. [First-Time Setup](#6-first-time-setup)
7. [Usage Flow](#7-usage-flow)
8. [Admin Portal Guide](#8-admin-portal-guide)
9. [API Reference](#9-api-reference)
10. [Security](#10-security)
11. [Site Structure](#11-site-structure)
12. [Daily Staff Usage](#12-daily-staff-usage)
13. [Backups & Recovery](#13-backups--recovery)
14. [Updating the Site](#14-updating-the-site)
15. [Production Deployment](#15-production-deployment)
16. [Debugging Common Problems](#16-debugging-common-problems)
17. [Project Roadmap](#17-project-roadmap)
18. [FAQ](#18-faq)

### Maintainer Documentation Bundle

- [Maintenance Playbook](docs/MAINTENANCE_PLAYBOOK.md)
- [File-Level Specifications](docs/FILE_LEVEL_SPECIFICATIONS.md)
- [Operations Runbook](docs/OPS_RUNBOOK.md)
- [Commenting Standard](docs/COMMENTING_STANDARD.md)
- [Project Structure Guide](docs/PROJECT_STRUCTURE.md)
- [Page Maintenance Guide](docs/PAGE_MAINTENANCE_GUIDE.md)

### Developer Ergonomics (New)

- Admin API integration tests:
  - `cd admin && npm test`
- Docker-based test execution (no host npm required):
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile test run --rm fcpl-admin-test`
- Faster admin frontend/backend iteration without rebuilding image each edit:
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up -d --build`
  - This mounts `admin/server.js` and `admin/public` directly into the running admin container.

---

## 1. Project Overview

### What It Is

The **FCPL Website & Staff Portal** is a fully self-hosted web platform for [Fayette County Public Libraries](https://fayette.lib.wv.us/) — a multi-branch public library system serving rural Fayette County, West Virginia. It replaces a legacy website with a modern, accessible, maintainable system that library staff can manage without any technical knowledge.

### What Problem It Solves

| Problem | Solution |
|---------|----------|
| Legacy CMS required vendor maintenance contracts | Fully self-hosted on any Docker-capable server |
| Staff needed technical skills to update content | Browser-based admin portal — no coding needed |
| Website inaccessible to patrons with disabilities | WCAG 2.1 AA compliant throughout |
| No content backup or audit trail | Auto-backup + 60-day recycle bin + activity log |
| Expensive hosted platform subscriptions | Runs on a single VPS or local server, zero SaaS fees |
| Slow page loads from heavy JavaScript frameworks | Zero-framework static HTML — loads in milliseconds |

### Who It Is For

- **Library staff** — manage events, hours, announcements, programs, and content through a browser
- **Library patrons** — find branch hours, upcoming events, digital resources, and library services
- **System administrators** — deploy and maintain the site via Docker Compose on any Linux server
- **Developers** — extend the static site or admin API with minimal toolchain overhead

### Why It Exists

Rural public libraries often lack IT budgets for commercial CMS platforms. This project delivers enterprise-grade security, accessibility, content management, and disaster recovery in a simple Docker stack that any library director can hand off to a successor without technical debt.

---

---

---

## 2. Key Features

| Feature | Description | Impact | Status |
|---------|-------------|--------|--------|
| **Zero-framework static site** | Pure HTML/CSS/JS — no React, Vue, or build pipeline | Sub-100ms page loads; no Node.js needed on host | ✅ Live |
| **Browser-based CMS** | Staff manage all content via a tabbed SPA admin portal | No coding or terminal access required for content changes | ✅ Live |
| **WCAG 2.1 AA Accessibility** | Skip links, ARIA labels, keyboard navigation, accessibility toolbar | Usable by patrons on screen readers, elderly, and children | ✅ Live |
| **Multi-layer security** | Nginx + Express dual rate-limiting, bcrypt(12), JWT, Helmet.js | Resistant to brute-force, XSS, clickjacking, CSRF, injection | ✅ Live |
| **Soft-delete recycle bin** | Deleted items recoverable for 60 days | Prevents accidental permanent loss of content | ✅ Live |
| **Auto-backup before writes** | Snapshot of data files created before every destructive change | One-click rollback to any previous state | ✅ Live |
| **Full audit log** | Every staff action logged with timestamp, IP, and detail | Accountability and forensics for every content change | ✅ Live |
| **Self-signed / Let's Encrypt TLS** | Local: auto-generated self-signed cert. Production: Certbot script | HTTPS on port 8443 out of the box | ✅ Live |
| **Image upload pipeline** | MIME-type validation, 5 MB cap, random filename on disk | Prevents file-type spoofing and enumerable URLs | ✅ Live |
| **Interactive event calendar** | Dynamic calendar widget fed by `events.json` via API | Patrons see accurate upcoming events in real-time | ✅ Live |
| **Bookmobile & Homebound pages** | Dedicated service pages for outreach programs | Serves patrons who cannot visit branches in person | ✅ Live |
| **5-branch location maps** | OpenStreetMap embed with per-branch hours and directions | Works without Google Maps API; no cost, no rate limits | ✅ Live |
| **Digital resources directory** | Staff-managed list of eBook/database links via admin portal | Patron-facing resource page always stays current | ✅ Live |
| **Holiday closure management** | Staff check holiday checkboxes; changes live immediately | Patrons never show up to a closed library | ✅ Live |
| **Docker Compose deployment** | Two-container stack: `fcpl-site` (Nginx) + `fcpl-admin` (Node.js) | Deploy anywhere Docker runs — VPS, bare metal, local | ✅ Live |

---

## 3. Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Host Machine                                 │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Docker Compose Stack                        │   │
│  │                                                                │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │              fcpl-site  (nginx:alpine)               │    │   │
│  │  │                                                       │    │   │
│  │  │  Port 8080 (HTTP)  ←──── Public Browser              │    │   │
│  │  │  Port 8443 (HTTPS) ←──── Public Browser (TLS)        │    │   │
│  │  │                                                       │    │   │
│  │  │  /               → Static HTML (site/)               │    │   │
│  │  │  /pages/*        → Static HTML pages                 │    │   │
│  │  │  /css, /js       → Static assets (30d cache)         │    │   │
│  │  │  /images/*       → Uploaded + static images          │    │   │
│  │  │  /data/*.json    → Content files (no-cache)          │    │   │
│  │  │  /admin/*   ─────────────────────────────────────┐   │    │   │
│  │  │  /api/*     ─────────────────────────────────┐   │   │    │   │
│  │  └──────────────────────────────────────────────│───│───┘    │   │
│  │                                                  │   │        │   │
│  │  ┌───────────────────────────────────────────────▼───▼──┐   │   │
│  │  │           fcpl-admin  (node:20-alpine)                │   │   │
│  │  │                                                        │   │   │
│  │  │  Internal port 3000 (not exposed to host)             │   │   │
│  │  │                                                        │   │   │
│  │  │  GET  /admin/         → Staff Portal SPA              │   │   │
│  │  │  POST /admin/api/auth/login                           │   │   │
│  │  │  GET|POST|PUT|DELETE /admin/api/events                │   │   │
│  │  │  GET|POST|PUT|DELETE /admin/api/announcements         │   │   │
│  │  │  GET|PUT /admin/api/content/:section                  │   │   │
│  │  │  POST /admin/api/upload                               │   │   │
│  │  │  GET|DELETE /admin/api/recycle-bin                    │   │   │
│  │  │  GET /admin/api/audit-log                             │   │   │
│  │  │  GET /admin/api/backups                               │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │                                                                │   │
│  │  Shared Volumes (bind-mounted):                                │   │
│  │    ./site/data/   ←→ /data/        (events.json, content.json) │  │
│  │    ./site/images/ ←→ /images/      (uploaded photos)           │  │
│  │    ./docker/certs/ → /etc/nginx/certs/ (TLS cert, read-only)   │  │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Technology | Role |
|-----------|-----------|------|
| `fcpl-site` | `nginx:alpine` | Reverse proxy, static file serving, TLS termination, rate limiting |
| `fcpl-admin` | `node:20-alpine` + Express | REST API for all content mutations; serves staff portal SPA |
| `site/` | Plain HTML/CSS/JS | Public-facing website — 16 pages, no JS framework |
| `admin/public/index.html` | Vanilla JS SPA | Staff content management portal — tabbed, responsive |
| `site/data/events.json` | JSON | Live event data — read by both nginx (static) and admin API |
| `site/data/content.json` | JSON | All other site content: branches, hours, programs, announcements |
| `docker/nginx.conf` | Nginx config | Security headers, CSP, rate limit zones, proxy rules, caching |
| `admin/.env` | Environment file | Credentials and secrets — never committed to git |

### Data Flow

```
Staff makes change in Admin Portal
          │
          ▼
POST/PUT/DELETE /admin/api/...
          │
    ┌─────▼─────┐
    │  Nginx    │──── Rate limit check (zone=admin_write: 30r/m)
    └─────┬─────┘
          │ proxy_pass
    ┌─────▼──────────────────────┐
    │  Express (fcpl-admin)       │
    │  1. requireAuth (JWT check) │
    │  2. writeLimiter (60/15min) │
    │  3. Input sanitisation      │
    │  4. autoBackup(file)        │
    │  5. writeJSON (atomic)      │
    │  6. addToBin / auditLog     │
    └─────────────────────────────┘
          │
          ▼
   ./site/data/*.json  (shared volume)
          │
          ▼
   Public site reads via fetch() → /data/events.json
   Calendar widget renders events in real-time
```

---

## 4. Technology Stack

### Runtime Stack

| Technology | Version | Why Chosen | Alternatives Considered | Tradeoffs |
|-----------|---------|-----------|------------------------|-----------|
| **Docker + Compose** | 29.3 / 5.1 | Zero host dependencies; reproducible deployments; easy backup of bind-mounted volumes | Bare-metal nginx, Podman | Docker requires root or docker group; Compose v2 has no separate install |
| **Nginx (Alpine)** | latest-alpine | Best-in-class static file serving; sub-ms latency; mature rate-limiting; tiny 8 MB image | Caddy, Apache, Traefik | Caddy has auto-HTTPS but adds complexity; Nginx config is well-understood by admins |
| **Node.js (Alpine)** | 20 LTS | LTS stability; native `crypto` module; excellent ecosystem for JWT/bcrypt; 50 MB image | Deno, Python/Flask, Go | Deno too new for rural IT handoff; Go requires compiled binary; Python slower startup |
| **Express.js** | 4.18 | Minimal, battle-tested, widely documented | Fastify, Koa, Hono | Fastify is faster but Express has more documentation for non-JS-native maintainers |
| **Plain HTML/CSS/JS** | ES2020 | Zero build pipeline; no npm vulnerabilities in frontend; loads in <100ms | React, Vue, Astro, HTMX | Frameworks add maintenance burden and version rot — library may not have a dev on staff |

### Security Dependencies (`admin/`)

| Package | Version | Purpose | Why This One |
|---------|---------|---------|-------------|
| `helmet` | ^7.2 | Sets 12 security response headers (CSP, HSTS, X-Frame-Options, etc.) | Industry standard; maintained by the Express team |
| `bcryptjs` | ^2.4 | Password hashing at cost factor 12 | Pure JS (no native bindings); portable across Alpine |
| `jsonwebtoken` | ^9.0 | JWT session tokens (HS256, 8-hour expiry) | Most widely audited JWT library for Node.js |
| `express-rate-limit` | ^7.4 | Request rate limiting per IP (login + write + global) | Works with `trust proxy 1` behind Nginx; draft-7 headers |
| `multer` | ^2.0 | Multipart file upload handling | Integrates cleanly with Express; supports `fileFilter` + `limits` |

### Frontend Libraries (CDN via HTML `<script>`)

| Library | Purpose | Notes |
|---------|---------|-------|
| **Leaflet.js** (unpkg) | Interactive branch location maps | No Google Maps API key required; OpenStreetMap tiles are free |
| **LibraryThing** (ltfl) | Book cover images in catalog widget | Optional external integration |
| **CDN Fonts** | Typography | `fonts.cdnfonts.com` — scoped in CSP |

---

## 5. Quick Start

```bash
# 1. Navigate to the project
cd /home/kevin/Projects/fayette_lib

# 2. Copy example env file (change password before going live!)
cp admin/.env.example admin/.env

# 3. Generate a self-signed TLS cert for local HTTPS
mkdir -p docker/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/certs/key.pem \
  -out docker/certs/cert.pem \
  -subj "/CN=localhost"

# 4. Start both containers
sudo docker compose up -d

# 5. Verify both containers are healthy
sudo docker compose ps

# 6. Open the website
xdg-open http://localhost:8080

# 7. Open the staff portal
xdg-open http://localhost:8080/admin/
```

**Stop the stack:** `sudo docker compose down`
**Rebuild after code changes:** `sudo docker compose up -d --build`
**View logs:** `sudo docker compose logs -f`

> **Docker permission error?** Add yourself to the docker group:
> `sudo usermod -aG docker $USER` — then log out and back in (or `newgrp docker`).

---

## 6. First-Time Setup

### Prerequisites

| Requirement | Check | Install |
|------------|-------|---------|
| Docker ≥ 24 | `docker --version` | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Docker Compose v2 | `docker compose version` | Included with Docker Desktop; `pacman -S docker-compose` on Arch |
| OpenSSL | `openssl version` | Pre-installed on most Linux distros |
| curl (optional) | `curl --version` | For endpoint verification |

No Node.js, Python, npm, or build tools are needed on the host machine.

### Step 1 — Configure your admin password

```bash
# Generate a bcrypt hash (cost factor 12) of your chosen password
sudo docker run --rm node:20-alpine node -e \
  "require('bcryptjs').hash('YOUR_PASSWORD', 12).then(h => console.log(h))"
```

The output starts with `$2a$12$...`. Copy it.

```bash
# Generate a strong JWT secret
openssl rand -hex 48
```

Open `admin/.env` and set both values:

```dotenv
# Paste the bcrypt hash here (preferred — production-safe)
STAFF_PASSWORD_HASH=$2a$12$...your-hash-here...

# Or use plaintext during initial testing only (not for production)
# STAFF_PASSWORD=your-password-here

# JWT signing secret — must be at least 32 characters
JWT_SECRET=your-long-random-secret-here
```

> ⚠️ `admin/.env` is listed in `.gitignore` — it must never be committed to version control.

### Step 2 — Generate TLS certificates

**Local development** (self-signed, browser will show a warning):
```bash
mkdir -p docker/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/certs/key.pem \
  -out docker/certs/cert.pem \
  -subj "/CN=localhost"
```

**Production** (trusted Let's Encrypt cert — after DNS is configured):
```bash
bash scripts/get-cert.sh your-library-domain.org admin@yourlibrary.org
```

### Step 3 — Start and verify

```bash
sudo docker compose up -d
sudo docker compose ps

# Verify HTTP endpoint
curl -I http://localhost:8080/

# Verify admin portal
curl -I http://localhost:8080/admin/
```

Both should return `HTTP/1.1 200 OK` (or `302` redirect for HTTP→HTTPS).

### Step 4 — Log in

Navigate to `http://localhost:8080/admin/` and enter your password.
Sessions last **8 hours**, then require re-login.

### Development vs Production

| Setting | Development | Production |
|---------|-------------|------------|
| Password | `STAFF_PASSWORD=...` (plaintext OK) | `STAFF_PASSWORD_HASH=...` (bcrypt required) |
| JWT Secret | Any string ≥ 32 chars | `openssl rand -hex 48` minimum |
| TLS cert | Self-signed (browser warning) | Let's Encrypt via `scripts/get-cert.sh` |
| HSTS preload | Off | Enable after HTTPS confirmed stable |
| Port | 8080 / 8443 | 80 / 443 (reverse proxy or firewall redirect) |

---

## 7. Usage Flow

### Public Patron Flow

```
Browser visits http://library-domain.org
        │
        ▼
   [Nginx: fcpl-site]
        │
        ├── / ────────────────► index.html (homepage)
        │                           │
        │                    JS fetches /data/events.json
        │                    JS fetches /data/content.json
        │                           │
        │                    Renders: announcements sidebar
        │                            upcoming events preview
        │                            homepage image slider
        │
        ├── /pages/programs.html  ► Programs & Events page
        ├── /pages/locations.html ► Branch map + hours (Leaflet)
        ├── /pages/ebooks.html    ► Digital resources list
        ├── /pages/bookmobile.html► Bookmobile schedule
        ├── /pages/homebound.html ► Homebound delivery service
        └── /pages/...            ► 16 total pages
```

### Staff Content Management Flow

```
Staff opens http://localhost:8080/admin/
        │
        ▼
   Login screen → POST /admin/api/auth/login
        │                    │
        │              [rate limited: 5r/m Nginx + 10/15min Express]
        │                    │
        │            ✓ Returns JWT token (8-hour expiry)
        │            ✗ Returns 401 (generic message)
        │
        ▼
   Admin Portal SPA (tabbed)
        │
        ├── 📅 Events tab
        │       ├── GET /admin/api/events              ← list all
        │       ├── POST /admin/api/events             ← add event
        │       ├── PUT /admin/api/events/:id          ← edit event
        │       └── DELETE /admin/api/events/:id       ← soft-delete
        │
        ├── 📢 Announcements tab
        │       └── CRUD /admin/api/announcements
        │
        ├── 🕒 Branch Hours tab
        │       └── PUT /admin/api/content/branches
        │
        ├── 📚 Programs / 🌐 Resources / ⚙️ Settings
        │       └── GET|PUT /admin/api/content/:section
        │
        ├── 🖼️ Images tab
        │       └── POST /admin/api/upload  (MIME check + 5MB cap)
        │
        ├── 🗑️ Recycle Bin  → restore/purge soft-deleted items
        ├── 🔍 Activity Log → audit trail (last 500 actions)
        └── 💾 Backups      → browse/restore auto-snapshots
```

---

## 8. Admin Portal Guide

### Tab Reference

| Tab | Icon | What You Can Do |
|-----|------|----------------|
| Events | 📅 | Add / edit / delete calendar events; upload event photos |
| Announcements | 📢 | Manage homepage sidebar announcements |
| Branch Hours | 🕒 | Edit hours for all 5 branches; holiday closures |
| Programs | 📚 | Storytime schedules, adult book club, Library Chef |
| Digital Resources | 🌐 | Manage eBook/database/website links |
| Analytics | 📊 | Page-view stats |
| System | ⚡ | Server health check; restart signal |
| Settings | ⚙️ | Site name, phone number, social media links |
| Calendars | 📆 | Manage shareable calendar feeds |
| Hosting Info | 🏠 | DNS, SSL cert status, server IP records |
| Staff | 👥 | Director, assistant, bookmobile staff names |
| Images | 🖼️ | Homepage slider photos and featured event cards |
| Recycle Bin | 🗑️ | Restore items deleted in the last 60 days |
| Activity Log | 🔍 | Full audit trail — every change with IP + timestamp |
| Backups | 💾 | Browse and restore automatic pre-change snapshots |

### Adding an Event

1. Click **📅 Events** → **+ Add Event**
2. Fill in: title, start date/time, end date/time, location, category, description
3. Optionally upload a photo (JPEG/PNG/GIF/WebP, max 5 MB)
4. Click **Save** — appears on the public calendar immediately

**Recurrence options:** None · Daily · Weekly · Monthly (by weekday)

### Managing Branch Hours

1. Click **🕒 Branch Hours** → **Edit Hours** next to the branch
2. Update rows — **+Row** to add time ranges, trash icon to remove
3. **Holiday Closures** section at the bottom: check holidays + optional notes
4. Click **Save Hours** — live instantly

### Recycle Bin

- Events, Announcements, Programs, Digital Resources, and Images are **soft-deleted**
- Items are kept for **60 days**, then permanently purged
- Click **Restore** to put an item back into its original tab
- Click **Delete Forever** to remove immediately

### Activity Log

- Records every save/delete with: timestamp · IP address · action type · detail
- Last **500 entries** retained
- Delete actions highlighted in red for quick scanning

### Backups

- Auto-snapshot of `events.json` or `content.json` taken **before every destructive write**
- Up to **20 backups** kept per file (oldest auto-pruned)
- Click **Restore** to roll back — this also creates a backup of the current state first (undo the undo)

---

## 9. API Reference

All API endpoints are under `/admin/api/`. All mutating endpoints require a `Bearer` JWT token in the `Authorization` header.

### Authentication

| Endpoint | Method | Auth | Description |
|---------|--------|------|-------------|
| `/admin/api/auth/login` | POST | None | Exchange password for JWT |

**Request:**
```json
{ "password": "your-staff-password" }
```
**Response:**
```json
{ "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

### Events

| Endpoint | Method | Auth | Description |
|---------|--------|------|-------------|
| `/admin/api/events` | GET | ✅ | List all events |
| `/admin/api/events` | POST | ✅ | Create new event |
| `/admin/api/events/:id` | PUT | ✅ | Update event by ID |
| `/admin/api/events/:id` | DELETE | ✅ | Soft-delete event (moves to recycle bin) |

**Event object fields:**
```json
{
  "id": 42,
  "title": "Summer Reading Kickoff",
  "start": "2026-06-01T10:00:00",
  "end": "2026-06-01T12:00:00",
  "location": "Oak Hill Branch",
  "category": "children",
  "description": "Join us for the start of summer reading...",
  "recurrence": "none",
  "image": "/images/events/1717200000-a1b2c3d4e5f6.jpg"
}
```

### Announcements

| Endpoint | Method | Auth | Description |
|---------|--------|------|-------------|
| `/admin/api/announcements` | GET | ✅ | List all announcements |
| `/admin/api/announcements` | POST | ✅ | Create announcement |
| `/admin/api/announcements/:idx` | PUT | ✅ | Update by array index |
| `/admin/api/announcements/:idx` | DELETE | ✅ | Soft-delete announcement |

### Content Sections

| Endpoint | Method | Auth | Description |
|---------|--------|------|-------------|
| `/admin/api/content/:section` | GET | ✅ | Read a content section |
| `/admin/api/content/:section` | PUT | ✅ | Update a content section |

**Allowed sections:** `site` · `staff` · `branches` · `programs` · `digital_resources` · `services` · `memorial_program` · `hosting` · `holiday_closures` · `homepage_features` · `jobs`

### Images

| Endpoint | Method | Auth | Description |
|---------|--------|------|-------------|
| `/admin/api/upload` | POST | ✅ | Upload image (multipart/form-data) |

Accepted: JPEG · PNG · GIF · WebP · Max 5 MB
Returns: `{ "url": "/images/events/timestamp-randomhex.ext" }`

### System & Audit

| Endpoint | Method | Auth | Description |
|---------|--------|------|-------------|
| `/admin/api/recycle-bin` | GET | ✅ | List deleted items |
| `/admin/api/recycle-bin/:bin_id/restore` | POST | ✅ | Restore an item |
| `/admin/api/recycle-bin/:bin_id` | DELETE | ✅ | Permanently delete |
| `/admin/api/audit-log` | GET | ✅ | Last 500 audit entries |
| `/admin/api/backups` | GET | ✅ | List available backups |
| `/admin/api/backups/restore` | POST | ✅ | Restore a backup |

### Response Conventions

| Status | Meaning |
|--------|---------|
| `200 OK` | Read success |
| `201 Created` | Write success |
| `400 Bad Request` | Invalid input |
| `401 Unauthorized` | Missing or expired JWT |
| `404 Not Found` | Resource doesn't exist |
| `413 Payload Too Large` | Image over 5 MB |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Server-side failure |

---

## 10. Security

### Defense-in-Depth Model

```
Internet Request
      │
      ▼
[Nginx — Layer 1]
  • Rate limit zones (general: 120r/m, admin_write: 30r/m, login: 5r/m)
  • Returns 429 on breach (not 503)
  • Security headers on every response
  • TLS 1.2/1.3 with strong cipher suite
      │
      ▼
[Express — Layer 2]
  • apiLimiter: 200 req/15min per IP
  • writeLimiter: 60 writes/15min per IP
  • loginLimiter: 10 attempts/15min per IP
  • JWT verification (HS256, 8-hour expiry)
  • Helmet.js (12 security headers)
      │
      ▼
[Application — Layer 3]
  • Password: bcrypt(12) + constant-time compare
  • Input: all fields sanitized and length-capped
  • Uploads: MIME-type checked, random filename
  • Files: path traversal prevention on all reads/writes
  • Writes: atomic (temp-file rename; no corruption on crash)
```

### Security Headers (Nginx — all responses)

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Camera/mic/payment blocked; geolocation self-only |
| `X-DNS-Prefetch-Control` | `off` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Content-Security-Policy` | Restricts scripts/styles/images/frames to trusted origins |

### Additional Admin Headers (Helmet.js)

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` (stricter for admin) |
| `Content-Security-Policy` | Admin-specific; blocks all external CDNs |

### Rate Limits

| Endpoint | Nginx | Express |
|---------|-------|---------|
| Login (`/admin/api/auth/login`) | 5 req/min, burst 3 | 10 req/15 min |
| Admin API writes | 30 req/min, burst 10 | 60 req/15 min |
| All admin API | — | 200 req/15 min |
| Public site | 120 req/min, burst 30 | — |

### OWASP Top 10 Mitigations

| OWASP Risk | Mitigation |
|-----------|------------|
| A02 Cryptographic Failures | bcrypt(12) for passwords; HS256 JWT with strong secret |
| A03 Injection | All inputs sanitized and truncated; no `eval`/`exec`; no SQL |
| A05 Misconfiguration | Helmet defaults; `server_tokens off`; no X-Powered-By header |
| A06 Vulnerable Components | Pinned npm dependencies; minimal image size |
| A07 Auth Failures | Rate limiting on login; JWT expiry; constant-time password comparison |
| A08 Software Integrity | Atomic writes (write→temp→rename); no partial JSON on crash |

### Changing the Password (Staff Departure)

```bash
# Step 1: Generate a new bcrypt hash
sudo docker run --rm node:20-alpine node -e \
  "require('bcryptjs').hash('NEW_PASSWORD_HERE', 12).then(h => console.log(h))"

# Step 2: Edit admin/.env — replace STAFF_PASSWORD_HASH
nano /home/kevin/Projects/fayette_lib/admin/.env

# Step 3: Restart admin container (< 5 seconds)
sudo docker compose restart fcpl-admin
```

To **immediately invalidate all active sessions**, also rotate `JWT_SECRET` in `.env` and restart.

### Known Limitations

- **Single shared password** — all staff use one credential. Departing staff access is revoked by changing the password. The Activity Log provides per-IP accountability.
- **No TOTP/2FA** — suitable for internal deployment; consider adding for internet-facing portals.
- **Self-signed cert** — local only; use `scripts/get-cert.sh` for production.

---

## 11. Site Structure

```
fayette_lib/
├── README.md                         ← This file
├── docker-compose.yml                ← Starts both containers
├── .gitignore
│
├── admin/                            ← Staff portal backend
│   ├── .env.example                  ← Template — copy to .env and edit
│   ├── .env                          ← ⚠️ SECRETS — never commit
│   ├── server.js                     ← Express REST API (~700 lines)
│   ├── package.json                  ← 5 production dependencies
│   ├── Dockerfile                    ← node:20-alpine, 9 steps
│   └── public/
│       └── index.html                ← Staff portal SPA (vanilla JS)
│
├── docker/
│   ├── Dockerfile                    ← nginx:alpine, 8 steps
│   ├── nginx.conf                    ← Nginx config + security headers
│   ├── docker-entrypoint.sh
│   └── certs/
│       ├── cert.pem                  ← TLS certificate (self-signed or LE)
│       └── key.pem                   ← TLS private key
│
├── site/                             ← Public website (static files)
│   ├── index.html                    ← Homepage
│   ├── 404.html
│   ├── robots.txt
│   ├── favicon.ico
│   ├── css/
│   │   └── style.css                 ← All styles; edit :root vars to retheme
│   ├── js/
│   │   ├── main.js                   ← Content loading, nav, tabs
│   │   ├── calendar.js               ← Public calendar widget
│   │   └── a11y.js                   ← Accessibility toolbar
│   ├── pages/                        ← All secondary pages
│   │   ├── about.html
│   │   ├── programs.html
│   │   ├── programs-adults.html
│   │   ├── programs-children.html
│   │   ├── programs-teens.html
│   │   ├── programs-community.html
│   │   ├── locations.html            ← Branch map (OpenStreetMap + Leaflet)
│   │   ├── research.html
│   │   ├── ebooks.html
│   │   ├── bookmobile.html
│   │   ├── homebound.html
│   │   ├── archives.html
│   │   ├── news.html
│   │   ├── jobs.html
│   │   ├── catalog.html
│   │   └── myaccount.html
│   ├── images/                       ← Static images + uploaded event photos
│   └── data/
│       ├── events.json               ← All calendar events (live data)
│       ├── content.json              ← Branches, hours, programs, announcements
│       ├── audit_log.json            ← Staff action log (0o640 — not public)
│       ├── recycle_bin.json          ← Soft-deleted items (0o640)
│       └── backups/                  ← Auto-snapshots (up to 20 per file)
│
├── scripts/
│   └── get-cert.sh                   ← Let's Encrypt cert for production
└── docs/
    └── site-audit.md                 ← Original site content audit
```

**The two key data files:**

| File | Contents | Who edits it |
|------|---------|-------------|
| `site/data/events.json` | All calendar events with dates, times, locations | Admin portal → Events tab |
| `site/data/content.json` | Branch hours, announcements, programs, staff, settings | Admin portal → all other tabs |

---

## 12. Daily Staff Usage

All content management happens at `http://localhost:8080/admin/` — no terminal access needed.

### Adding an Event

1. **📅 Events** → **+ Add Event**
2. Fill in title, date/time, location, category, description
3. Optionally upload a photo
4. **Save** — event appears on the public calendar immediately

### Adding an Announcement

1. **📢 Announcements** → **+ Add Announcement**
2. Fill in title, body text, optional link
3. **Save** — appears in the homepage sidebar immediately

### Editing Branch Hours

1. **🕒 Branch Hours** → **Edit Hours** next to the branch
2. Update time rows; **+Row** adds a new row; trash icon removes
3. **Save** — live immediately

### Setting Holiday Closures

1. **🕒 Branch Hours** → scroll to **Holiday Closures**
2. Check the holiday checkboxes when the library is closed
3. Add any patron-facing notice in the text field
4. **Save Holiday Closures**

### Managing Digital Resources

- **🌐 Digital Resources** → Add / Edit / Delete eBook and database links

### Homepage Images

- **🖼️ Images** → Upload slider photos and featured event cards
- Keep original images under 1 MB for fast page loads

---

## 13. Backups & Recovery

### Automatic Backups

A snapshot of `events.json` or `content.json` is saved to `site/data/backups/` **before every destructive write** through the admin portal. Up to 20 backups are kept per file (oldest auto-pruned).

### Manual Backup

```bash
# Full data export to a timestamped folder
cp -r /home/kevin/Projects/fayette_lib/site/data/ ~/fcpl-backup-$(date +%Y%m%d)/
```

### Restoring via Admin Portal

1. Log into the admin portal
2. Click **💾 Backups**
3. Find the backup and click **Restore**

### Restoring via Terminal

```bash
# List available backups
ls /home/kevin/Projects/fayette_lib/site/data/backups/

# Restore events
cp site/data/backups/events_2026-03-31T14-22-00.json site/data/events.json

# Restore content
cp site/data/backups/content_2026-03-31T09-15-00.json site/data/content.json
```

No container restart needed — changes are live immediately since files are bind-mounted.

---

## 14. Updating the Site

### After Editing HTML, CSS, or JS

```bash
sudo docker compose up -d --build
```

### After Editing `site/data/events.json` or `site/data/content.json` Directly

No rebuild needed — volume-mounted files are live immediately.

### After Editing `admin/server.js` or `admin/public/index.html`

```bash
sudo docker compose up -d --build
```

### Changing the Color Theme

Open `site/css/style.css` and edit the CSS variables in `:root { ... }` at the top of the file. Then rebuild.

### Updating Branch Map Coordinates

1. Look up the address at [nominatim.openstreetmap.org](https://nominatim.openstreetmap.org/)
2. Find the `BRANCHES` object in `site/pages/locations.html`
3. Update `lat` and `lng` for the branch
4. Rebuild

---

## 15. Production Deployment

### Server Requirements

| Resource | Minimum | Recommended |
|---------|---------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 512 MB | 1 GB |
| Disk | 5 GB | 20 GB |
| OS | Any Linux with Docker | Ubuntu 24 LTS / Arch |
| Inbound ports | 80, 443 | 80, 443 |

### DNS Setup

Point your domain's A record to the server's public IP, then:

```bash
# After DNS propagates, obtain a real TLS certificate
bash scripts/get-cert.sh your-library-domain.org admin@yourlibrary.org
```

### Going Live Checklist

```
[ ] Set STAFF_PASSWORD_HASH (bcrypt, not plaintext) in admin/.env
[ ] Set JWT_SECRET to output of: openssl rand -hex 48
[ ] Replace self-signed cert with Let's Encrypt cert
[ ] Confirm HTTPS works at https://your-domain.org
[ ] Set HSTS preload: true in admin/server.js (after HTTPS is stable)
[ ] Add the user to the docker group: sudo usermod -aG docker $USER
[ ] Set up daily data backup cron: cp -r site/data/ ~/backups/fcpl-$(date +%Y%m%d)/
[ ] Configure server firewall to allow only ports 80 and 443
[ ] Point domain DNS A record to server IP
```

---

## 16. Debugging Common Problems

### Site Won't Start

```bash
# Check container status
sudo docker compose ps

# View logs
sudo docker compose logs fcpl-site
sudo docker compose logs fcpl-admin

# Rebuild from scratch
sudo docker compose down
sudo docker compose up -d --build
```

### Admin Portal Login Loop / "Authentication Required"

- Verify `admin/.env` exists and contains `STAFF_PASSWORD_HASH` or `STAFF_PASSWORD`
- Hash must start with `$2a$12$...`
- `JWT_SECRET` must be at least 32 characters
- Restart: `sudo docker compose restart fcpl-admin`

### Calendar Not Showing Events

```bash
# Validate JSON syntax
python3 -m json.tool site/data/events.json
```

Events need: `"id"`, `"title"`, and `"start"` (ISO 8601: `"2026-06-01T10:00:00"`).

### Images Not Uploading

- Max size: 5 MB
- Accepted types: JPEG, PNG, GIF, WebP
- Check disk space: `df -h`
- Check logs: `sudo docker compose logs fcpl-admin`

### "Too Many Requests" in Admin Portal

- You've hit the write rate limit (60 ops/15 minutes per IP)
- Wait 15 minutes — this is intentional security behaviour

### Self-Signed Cert Warning in Browser

Expected for local development. For production, run `scripts/get-cert.sh` to get a trusted Let's Encrypt cert.

### nginx Won't Start ("cannot load certificate")

The `docker/certs/` directory is missing `cert.pem` / `key.pem`. Generate them:

```bash
mkdir -p docker/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/certs/key.pem -out docker/certs/cert.pem -subj "/CN=localhost"
```

### How to View the Audit Log from Terminal

```bash
cat site/data/audit_log.json | python3 -m json.tool | head -100
```

---

## 17. Project Roadmap

| Phase | Timeline | Goals | Status |
|-------|----------|-------|--------|
| **Phase 1 — Core Site** | Q1 2026 | Static website with all 16 pages; Docker stack; WCAG 2.1 AA | ✅ Complete |
| **Phase 2 — Admin Portal** | Q1 2026 | Staff CMS: events, hours, announcements, programs, images | ✅ Complete |
| **Phase 3 — Security Hardening** | Q1 2026 | OWASP Top 10 mitigations; dual-layer rate limiting; bcrypt + JWT | ✅ Complete |
| **Phase 4 — Resilience** | Q1 2026 | Auto-backup, recycle bin, activity log, atomic writes | ✅ Complete |
| **Phase 5 — Production TLS** | Q2 2026 | Let's Encrypt cert automation; HSTS preload | ✅ Complete |
| **Phase 6 — Production Deploy** | Q2 2026 | Go live at fayette.lib.wv.us; DNS cutover; smoke tests | 🟡 In Progress |
| **Phase 7 — Analytics** | Q3 2026 | Self-hosted page-view analytics (no Google Analytics) | ⭕ Planned |
| **Phase 8 — Mobile App** | Q4 2026 | Progressive web app (PWA) manifest + offline support | ⭕ Planned |
| **Phase 9 — Multi-Staff** | 2027 | Optional: per-staff accounts with role-based permissions | ⭕ Backlog |

---

## 18. FAQ

**Q: How do I add a new branch?**
Go to admin → **🕒 Branch Hours** → scroll to the bottom → **+ Add Branch**.

**Q: Can I restore something I deleted by mistake?**
Yes — **🗑️ Recycle Bin** tab. Items are kept for 60 days.

**Q: How do I close the library for a holiday?**
Check the holiday in **🕒 Branch Hours → Holiday Closures**, or add a calendar event with category `closure`.

**Q: A staff member left — how do I prevent access?**
Change the admin password. See [Section 10 — Security](#10-security). Takes effect immediately on restart.

**Q: How do I see what someone changed?**
**🔍 Activity Log** tab — every action is recorded with IP and timestamp.

**Q: The site looks wrong after I edited something — how do I undo?**
**💾 Backups** tab → restore the snapshot before your change. Or from terminal: copy from `site/data/backups/`.

**Q: How do I move this to a real web server?**
1. Copy the project directory to the server
2. Install Docker
3. `sudo docker compose up -d`
4. Point your domain DNS to the server IP
5. Run `scripts/get-cert.sh your-domain.org your@email.com`
6. Done — no other dependencies needed

**Q: How do I back up everything?**
```bash
cp -r site/data/ ~/fcpl-backup-$(date +%Y%m%d)/
```

**Q: Can staff access the portal from another computer?**
Yes — navigate to `http://SERVER_IP:8080/admin/` from any machine on the same network.

**Q: Why aren't we using WordPress / Drupal / Squarespace?**
Those platforms require ongoing maintenance, license fees, plugin management, and vulnerability patching. This codebase has 5 npm dependencies, no database, and runs on any $6/month VPS. The staff can manage all content without ever touching code.

---

*Built for Fayette County Public Libraries, Fayette County, West Virginia.*
*All site content and data belong to FCPL.*

---
