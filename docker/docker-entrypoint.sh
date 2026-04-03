#!/bin/sh
# Requirement ID: SPEC-INFRA-001
# Purpose: select active certificate and hot-reload nginx when certbot renews.
# This script is placed in /docker-entrypoint.d/ so nginx's native entrypoint
# runs it BEFORE starting nginx — no need to override the base ENTRYPOINT.
# Rationale: /docker-entrypoint.d/ is the correct extension point for nginx:alpine.
# Inputs: DOMAIN env var, certbot live paths, /var/certbot/reload-trigger file.
# Outputs: /etc/ssl/fcpl/{server.crt,server.key} symlinks pointing at active cert;
#          background watcher that reloads nginx on certbot renewal.
# Preconditions: /etc/ssl/fcpl/ created during image build with self-signed fallback.
# Postconditions: nginx uses latest available cert without full container rebuild.
# Failure Modes: missing cert files, invalid DOMAIN, reload failure.
# Error Handling: fall through to self-signed cert on any missing LE cert file.
# Verification: check startup logs; run TLS handshake inspection after renewal.
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
  echo "[ssl] Run 'bash scripts/get-cert.sh <domain> <email>' on the server for a trusted cert."
fi

# ── Conditional HSTS ──────────────────────────────────────────
# HSTS is ONLY enabled when a verified Let's Encrypt cert is active.
# Without it, visiting HTTPS once would lock browsers off HTTP for a year.
# HTTP (port 80) is always fully functional without any HTTPS requirement.
mkdir -p /etc/nginx/conf.d
if [ -n "$DOMAIN" ] && [ -f "${LE_DIR}/fullchain.pem" ]; then
  printf 'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n' \
    > /etc/nginx/conf.d/hsts.conf
  echo "[ssl] HSTS enabled for ${DOMAIN}"
else
  printf '# HSTS disabled — HTTP fully functional; HTTPS available but not enforced.\n' \
    > /etc/nginx/conf.d/hsts.conf
  echo "[ssl] HSTS disabled (HTTP-first mode — no lock-in)"
fi

# ── Background watcher: reload nginx when certbot renews ───────
# Runs as a background process; nginx is started by the base entrypoint after
# all /docker-entrypoint.d/ scripts complete (so nginx -s reload works).
(while true; do
  sleep 30
  if [ -f "$TRIGGER" ]; then
    rm -f "$TRIGGER"
    if [ -n "$DOMAIN" ] && [ -f "${LE_DIR}/fullchain.pem" ]; then
      ln -sf "${LE_DIR}/fullchain.pem" /etc/ssl/fcpl/server.crt
      ln -sf "${LE_DIR}/privkey.pem"   /etc/ssl/fcpl/server.key
    fi
    nginx -s reload 2>/dev/null && echo "[ssl] Certificate reloaded" || true
  fi
done) &

# Do NOT call exec nginx here — the nginx base entrypoint does that after
# all /docker-entrypoint.d/ scripts have returned successfully.
