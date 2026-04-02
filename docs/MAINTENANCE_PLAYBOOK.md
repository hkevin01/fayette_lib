# FCPL Maintenance Playbook

## Purpose
This document is the operational guide for maintainers who need to update, debug, or recover the FCPL website and staff portal.

## Audience
- Library staff with light web development experience
- New maintainers inheriting the project
- Contractors performing emergency fixes

## System Summary
- Public site: static files served by Nginx container
- Admin portal UI: static single-page HTML served by admin Node container at /admin
- Admin API: Express server with JWT auth and JSON file persistence
- Persistent data: site/data directory mounted into containers

## Preconditions
- Docker and Docker Compose installed
- Access to repository and deployment host
- Ability to run sudo for Docker commands
- Environment file configured in admin/.env

## Postconditions for Any Change
- Service containers are healthy
- Admin login works
- Public homepage loads over HTTP/HTTPS
- Modified feature is manually verified
- Git commit references what changed and why

## High-Risk Areas
- admin/server.js: data validation, auth, write paths
- admin/public/index.html: full admin UI and client logic in one file
- site/data/content.json: source of truth for many public pages
- docker/nginx.conf: routing, caching, and reverse proxy controls

## Change Workflow
1. Pull latest main and inspect local status.
2. Implement changes in smallest reasonable scope.
3. Validate syntax/lint issues in changed files.
4. Rebuild containers when admin UI or backend code changes.
5. Run smoke tests listed below.
6. Commit with clear message and push.

## Smoke Test Checklist
1. Public site loads: /, /pages/locations.html, /pages/programs.html
2. Admin login succeeds and token-authenticated tabs load
3. Event create/edit/delete works and appears in calendar
4. Content save works for at least one content section
5. Hosting tab live refresh succeeds or fails gracefully
6. Image upload and delete still work

## Failure Modes and Handling
- Docker permission denied:
  - Cause: user not in docker group or needs sudo
  - Action: rerun command with sudo; ensure account privileges
- Admin UI changes not visible:
  - Cause: admin assets baked into image, not bind-mounted
  - Action: rebuild fcpl-admin and refresh browser cache
- JSON write failures:
  - Cause: file permission mismatch on mounted volume
  - Action: correct ownership/permissions in site/data
- Authentication failures after restart:
  - Cause: JWT secret changed or missing
  - Action: verify admin/.env and restart with stable JWT secret

## Constraints
- Keep stack framework-free on public frontend
- Do not bypass sanitization in admin API
- Preserve atomic JSON write behavior
- Keep backward compatibility for existing content sections

## Verification Evidence to Capture
- git status and diff summary
- container restart output
- before/after screenshots for UI changes
- manual test notes for impacted paths

## References
- docs/FILE_LEVEL_SPECIFICATIONS.md
- docs/OPS_RUNBOOK.md
- README.md
