#!/bin/bash
# Requirement ID: SPEC-INFRA-001
# Purpose: obtain and activate Let's Encrypt certificate for production domain.
# Rationale: reduce manual TLS provisioning errors during operations handoff.
# Inputs: domain and contact email arguments.
# Outputs: certificate files in letsencrypt volume; nginx hot-reloaded with real cert.
# Preconditions: DNS A record points to host; docker compose stack running; port 80 open.
# Postconditions: HTTPS endpoint serves trusted certificate; certbot auto-renews it.
# Failure Modes: DNS mismatch, rate limits, ACME challenge failure, docker permission errors.
# Error Handling: immediate non-zero exit on command failure (set -e).
# Verification: visit https://<domain> and inspect certificate issuer/expiry.
# ================================================================
# get-cert.sh  —  Obtain a Let's Encrypt TLS certificate
#
# Usage:  bash scripts/get-cert.sh <your-domain.com> <admin@email.com>
# Example: bash scripts/get-cert.sh library.fayettewv.org director@fayettepl.org
#
# Run this ONCE on the production server after:
#   1. DNS A record for your domain points to this server's public IP
#   2. docker compose up -d is already running (ports 80 AND 443 reachable)
#   3. Firewall allows inbound TCP 80 and 443
# ================================================================
set -e

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: bash scripts/get-cert.sh <domain> <email>"
  echo "Example: bash scripts/get-cert.sh library.fayettewv.org admin@example.com"
  exit 1
fi

echo "► Requesting Let's Encrypt certificate for ${DOMAIN} (contact: ${EMAIL})"
echo "  Ensure the DNS A record for ${DOMAIN} points to this server's public IP first!"
echo ""

# Persist DOMAIN so the fcpl-site container entrypoint activates the LE cert on next start.
# This only writes if DOMAIN is not already set in .env.
if [ -f .env ]; then
  if ! grep -q "^DOMAIN=" .env; then
    echo "DOMAIN=${DOMAIN}" >> .env
    echo "► Appended DOMAIN=${DOMAIN} to .env"
  fi
else
  echo "DOMAIN=${DOMAIN}" > .env
  echo "► Created .env with DOMAIN=${DOMAIN}"
fi

# Issue the certificate via the certbot container (uses the shared ACME webroot volume)
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos --no-eff-email

echo ""
echo "✓ Certificate obtained!"
echo "► Signalling nginx to hot-reload with the new certificate..."

# Touch the reload-trigger file inside the shared certbot-data volume.
# The entrypoint background watcher detects this and gracefully reloads nginx.
docker compose exec fcpl-site sh -c "touch /var/certbot/reload-trigger"

sleep 3
echo ""
echo "✓ Done! Visit https://${DOMAIN} — trusted certificate, no browser warning."
echo ""
echo "Certificates auto-renew every 12 hours when < 30 days remain (90-day certs)."
echo ""
echo "Next step — HSTS preload: once the site is stable on HTTPS, submit at:"
echo "  https://hstspreload.org"
