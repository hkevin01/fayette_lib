# Operations Runbook

## Scope
Day-2 operations for deploy, restart, rollback, and troubleshooting.

## Production Deployment (Phase 6)

### Prerequisites
1. VPS or server with Docker and Docker Compose v2 installed
2. Inbound firewall ports 80 and 443 open
3. DNS A record for your domain pointing to the server's public IP (allow 5–60 min to propagate)
4. `admin/.env` configured with strong JWT_SECRET and STAFF_PASSWORD_HASH (bcrypt)

### First-Time Deploy
```bash
# 1. Clone and enter the repo
git clone git@github.com:hkevin01/fayette_lib.git && cd fayette_lib

# 2. Run pre-deployment checks (validates secrets, ports, DNS, files)
bash scripts/pre-deploy-check.sh your-library-domain.org

# 3. Set DOMAIN in .env (pre-deploy-check.sh does this automatically if passed)
echo 'DOMAIN=your-library-domain.org' >> .env

# 4. Start the stack on production ports 80/443
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 5. Obtain the real TLS certificate (port 80 must be reachable on the domain)
bash scripts/get-cert.sh your-library-domain.org admin@yourlibrary.org

# 6. Run smoke tests against live domain
bash scripts/smoke-test.sh your-library-domain.org
```

### Generate a Bcrypt Password Hash
```bash
# Using Node (from admin/ directory)
node -e "const b=require('bcrypt');b.hash('YOUR_PASSWORD',12).then(console.log)"

# Paste the output as STAFF_PASSWORD_HASH in admin/.env
```

### Generate a Strong JWT Secret
```bash
openssl rand -hex 48
# Paste the output as JWT_SECRET in admin/.env
```

### Daily Backup Cron (recommended)
```bash
# Add to root crontab: crontab -e
0 2 * * * cp -r /path/to/fayette_lib/site/data/ ~/backups/fcpl-$(date +%Y%m%d)/ 2>&1 | logger -t fcpl-backup
```

## Build and Deploy (updates)
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
