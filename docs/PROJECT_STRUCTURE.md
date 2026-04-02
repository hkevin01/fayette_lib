# Project Structure Guide

This document explains what each major path in the repository does and who usually edits it.

## Top-Level Layout
- README.md: primary project overview and setup documentation.
- docker-compose.yml: service topology for public site and admin backend.
- admin/: staff portal backend and admin UI.
- docker/: nginx runtime configuration and container entry assets.
- site/: public website static pages, styles, scripts, and data.
- docs/: maintainability and operational documentation.
- scripts/: utility scripts for certificate and deployment support.

## admin/
- Dockerfile: admin runtime container build definition.
- package.json: backend dependencies and metadata.
- server.js: Express API, auth, sanitization, backups, audit logging.
- public/index.html: single-file admin SPA with all tabs and client logic.

## docker/
- Dockerfile: public site image build and static asset copy.
- nginx.conf: routing, security headers, caching, and proxy rules.
- docker-entrypoint.sh: runtime startup behavior for nginx container.
- certs/: TLS certificate mount location for local/prod HTTPS.

## site/
- index.html and pages/: public-facing content pages.
- css/style.css: visual styles and responsive behavior.
- js/main.js: shared frontend data hydration and interactions.
- js/calendar.js: calendar renderer and export links.
- js/a11y.js: accessibility toolbar and preference persistence.
- data/content.json: primary content source for most public pages.
- data/events.json: event feed used by calendar views.
- data/analytics.json: collected page/event analytics events.
- data/audit_log.json: admin operation audit trail.
- data/recycle_bin.json: soft-deleted content metadata.
- images/: static and uploaded image assets.

## docs/
- site-audit.md: historical source-site analysis.
- MAINTENANCE_PLAYBOOK.md: maintainer-oriented change policy and checklist.
- FILE_LEVEL_SPECIFICATIONS.md: requirement-style contracts for core files.
- OPS_RUNBOOK.md: deploy/restart/rollback troubleshooting procedures.
- COMMENTING_STANDARD.md: required source code comment format.

## Ownership Guidance
- Content edits by staff: through admin UI only.
- Runtime behavior changes: admin/server.js, nginx.conf, main.js, calendar.js.
- Infrastructure changes: docker-compose.yml, Dockerfiles, nginx.conf.
- Documentation updates: docs/ and README.md in same commit as behavior changes.

## Safe Edit Order for New Maintainers
1. Read docs/MAINTENANCE_PLAYBOOK.md
2. Read docs/FILE_LEVEL_SPECIFICATIONS.md
3. Inspect targeted source file and its requirement comments
4. Implement smallest viable change
5. Run smoke test checklist from playbook
6. Commit with rationale and impacted requirement IDs
