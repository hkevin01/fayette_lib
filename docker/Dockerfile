# Fayette County Public Libraries — Static Site
# Phase 5: TLS-ready. Self-signed cert in dev; Let's Encrypt in production.
# To activate a real cert: bash scripts/get-cert.sh <domain> <email>
# Requirement ID: SPEC-INFRA-001
FROM nginx:alpine

# curl for healthcheck; openssl for self-signed cert generation
RUN apk add --no-cache curl openssl

# Remove default nginx config; seed empty hsts.conf (entrypoint overwrites it at runtime)
RUN rm /etc/nginx/conf.d/default.conf && \
    echo '# HSTS disabled — entrypoint enables this only when a real LE cert is active' \
      > /etc/nginx/conf.d/hsts.conf

# Generate self-signed certificate for development / fallback use.
# get-cert.sh replaces this with a trusted Let's Encrypt certificate in production.
RUN mkdir -p /etc/ssl/fcpl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
      -keyout /etc/ssl/fcpl/server.key \
      -out    /etc/ssl/fcpl/server.crt \
      -subj   "/CN=localhost/O=Fayette County Public Libraries/C=US" && \
    chmod 600 /etc/ssl/fcpl/server.key

# Cert-setup script runs via nginx's /docker-entrypoint.d/ mechanism BEFORE nginx
# starts. It selects the right cert (Let's Encrypt or self-signed) and launches
# a background watcher that hot-reloads nginx when certbot renews the cert.
COPY docker/docker-entrypoint.sh /docker-entrypoint.d/01-ssl-setup.sh
RUN chmod +x /docker-entrypoint.d/01-ssl-setup.sh

# Copy our nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Create the certbot webroot and reload-trigger dirs so volume mounts work
RUN mkdir -p /var/www/certbot /var/certbot

# Copy the static site files
COPY site/ /usr/share/nginx/html/

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsk --max-time 3 https://127.0.0.1/ -o /dev/null || \
      curl -fs  --max-time 3 http://127.0.0.1/  -o /dev/null || exit 1
