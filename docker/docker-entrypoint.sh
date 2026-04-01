#!/bin/sh
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
