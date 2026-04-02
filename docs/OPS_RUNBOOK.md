# Operations Runbook

## Scope
Day-2 operations for deploy, restart, rollback, and troubleshooting.

## Build and Deploy
1. Pull latest changes.
2. Rebuild and restart stack:
   - sudo docker compose up -d --build fcpl-admin fcpl-site
3. Validate:
   - sudo docker compose ps
   - open public site and admin portal

## Routine Update Procedure
1. git pull origin main
2. implement change
3. verify changed files locally
4. rebuild containers if admin/server or admin/public changed
5. commit and push

## Rollback Procedure
1. Identify last known good commit.
2. Checkout or cherry-pick rollback commit.
3. Rebuild services.
4. Confirm health and core smoke tests.

## Data Recovery
- Data lives in site/data
- Use admin Backups tab or backup restore endpoint when needed
- Never delete backup files until restore is confirmed

## Incident Triage
- Symptom: admin API 401 on every call
  - check JWT secret consistency and login flow
- Symptom: edits not visible in admin UI
  - rebuild admin image, hard refresh browser
- Symptom: cannot write content
  - inspect ownership/permissions under site/data
- Symptom: live hosting discovery blank
  - verify outbound DNS/HTTPS from container and retry

## Verification Gates
- Critical pages load
- Admin login and save operation works
- No syntax/runtime errors in changed files
- git status clean after release commit
