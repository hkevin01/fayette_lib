#!/bin/bash
# ================================================================
# get-cert.sh  —  Obtain a Let's Encrypt TLS certificate
#
# Usage:  bash scripts/get-cert.sh <your-domain.com> <admin@email.com>
# Example: bash scripts/get-cert.sh library.fayettewv.org director@fayettepl.org
#
# Run this ONCE on the production server after:
#   1. DNS A record for your domain points to this server's public IP
#   2. docker-compose is already running (port 80 must be reachable)
#   3. DOMAIN= is set in your .env or docker-compose environment
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
echo "  Make sure the domain's DNS A record points to this server's public IP first!"
echo ""

# Request the cert — nginx must already be running to serve the ACME challenge
sudo docker-compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos --no-eff-email

echo ""
echo "✓ Certificate obtained!"
echo "► Restarting nginx to load the real certificate..."
sudo docker-compose restart fcpl-site

echo ""
echo "✓ Done! Visit https://${DOMAIN} — no browser warning this time."
echo ""
echo "Note: Certificates auto-renew every 12 hours if needed (Let's Encrypt"
echo "      certs last 90 days; Certbot renews when < 30 days remain)."
