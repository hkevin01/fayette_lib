#!/bin/sh
# Requirement ID: SPEC-INFRA-001
# Purpose: bind active certificate material and keep nginx cert links refreshed.
# Rationale: support dev self-signed mode and production certbot renewals.
# Inputs: DOMAIN env var, certbot live paths, renewal trigger file.
# Outputs: active cert symlinks and nginx reload when certificates rotate.
# Preconditions: nginx runtime has readable certificate paths.
# Postconditions: nginx uses latest available cert without full container rebuild.
# Failure Modes: missing cert files, invalid DOMAIN, reload failure.
# Error Handling: fail fast for startup errors; tolerate reload errors to avoid crash loop.
# Verification: check startup logs and run TLS handshake inspection after renewal.
set -e

DOMAIN="${DOMAIN:-}"
LE_DIR="/etc/letsencrypt/live/${DOMAIN}"
TRIGGER="/var/certbot/reload-trigger"

# ── Select certificate ─────────────────────────────────────────
if [ -n "$DOMAIN" ] && [ -f "${LE_DIR}/fullchain.pem" ]; then
  ln -sf "${LE_DIR}/fullchain.pem" /etc/ssl/fcpl/server.crt
  ln -sf "${LE_DIR}/privkey.pem"   /etc/ssl/fcpl/server.key
  echo "[ssl] Using Let's Encrypt certificate for ${DOMAIN}"
else
  echo "[ssl] Self-signed certificate in use (dev/localhost mode)."
  echo "[ssl] Run 'bash scripts/get-cert.sh <domain> <email>' on the server to get a real certificate."
fi

# ── Background watcher: reload nginx when certbot renews ───────
(while true; do
  if [ -f "$TRIGGER" ]; then
    rm -f "$TRIGGER"
    if [ -n "$DOMAIN" ] && [ -f "${LE_DIR}/fullchain.pem" ]; then
      ln -sf "${LE_DIR}/fullchain.pem" /etc/ssl/fcpl/server.crt
      ln -sf "${LE_DIR}/privkey.pem"   /etc/ssl/fcpl/server.key
    fi
    nginx -s reload 2>/dev/null && echo "[ssl] Certificate reloaded" || true
  fi
  sleep 30
done) &

exec nginx -g "daemon off;"
