# Fayette County Public Libraries — Static Site
# Served by nginx:alpine over plain HTTP.
# TODO: When a domain + Let's Encrypt cert is ready, restore HTTPS:
#   - Re-add openssl + cert generation (or mount real certs)
#   - Restore the HTTPS server block in nginx.conf
#   - Run: bash scripts/get-cert.sh <domain> <email>
FROM nginx:alpine

# curl for healthcheck
RUN apk add --no-cache curl

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy the static site files
COPY site/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fs --max-time 3 http://127.0.0.1/ -o /dev/null || exit 1
