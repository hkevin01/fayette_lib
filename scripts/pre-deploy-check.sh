#!/usr/bin/env bash
# Requirement ID: SPEC-INFRA-001
# Purpose: validate all prerequisites before going live in production.
# Run from the repo root on the production server BEFORE running docker compose.
# Usage: bash scripts/pre-deploy-check.sh [domain]
# ================================================================
set -euo pipefail

DOMAIN="${1:-${DOMAIN:-}}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; WARN=0

pass() { echo -e "  ${GREEN}✓${NC} $*"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $*"; ((FAIL++)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $*"; ((WARN++)); }

echo ""
echo -e "${BOLD}================================================${NC}"
echo -e "${BOLD}  FCPL Pre-Deployment Check${NC}"
echo -e "${BOLD}================================================${NC}"
echo ""

# ── 1. Docker available ───────────────────────────────────────
echo -e "${BOLD}[1] Docker${NC}"
if docker info &>/dev/null; then
    pass "Docker daemon is running"
else
    fail "Docker daemon not running — run: sudo systemctl start docker"
fi

if docker compose version &>/dev/null; then
    pass "Docker Compose v2 available ($(docker compose version --short))"
else
    fail "Docker Compose v2 not found — install docker-compose-plugin"
fi

# ── 2. Ports 80 and 443 are not in use ────────────────────────
echo ""
echo -e "${BOLD}[2] Ports${NC}"
for port in 80 443; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
        fail "Port ${port} already in use — stop whatever is listening"
    else
        pass "Port ${port} is free"
    fi
done

# ── 3. admin/.env secrets ─────────────────────────────────────
echo ""
echo -e "${BOLD}[3] Secrets (admin/.env)${NC}"
ENV_FILE="admin/.env"
if [ ! -f "$ENV_FILE" ]; then
    fail "admin/.env not found — copy admin/.env.example and fill in values"
else
    pass "admin/.env exists"

    # JWT_SECRET must be set and not the placeholder
    JWT=$(grep "^JWT_SECRET=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
    if [ -z "$JWT" ] || [ "$JWT" = "change-me-to-a-long-random-string-in-production" ]; then
        fail "JWT_SECRET is not set or is still the placeholder"
        echo "         Generate one: openssl rand -hex 48"
    elif [ "${#JWT}" -lt 32 ]; then
        fail "JWT_SECRET is too short (${#JWT} chars) — must be ≥ 32"
    else
        pass "JWT_SECRET is set (${#JWT} chars)"
    fi

    # STAFF_PASSWORD_HASH preferred; STAFF_PASSWORD accepted but warned
    if grep -q "^STAFF_PASSWORD_HASH=" "$ENV_FILE"; then
        HASH=$(grep "^STAFF_PASSWORD_HASH=" "$ENV_FILE" | cut -d= -f2- | tr -d '"')
        if [[ "$HASH" == '$2'* ]]; then
            pass "STAFF_PASSWORD_HASH is a bcrypt hash ✓"
        else
            fail "STAFF_PASSWORD_HASH does not look like a bcrypt hash (should start with \$2...)"
        fi
    elif grep -q "^STAFF_PASSWORD=" "$ENV_FILE"; then
        PLAIN=$(grep "^STAFF_PASSWORD=" "$ENV_FILE" | cut -d= -f2-)
        if [ "$PLAIN" = "fcpl@dmin2026" ]; then
            fail "STAFF_PASSWORD is still the example default — change it before going live"
        else
            warn "STAFF_PASSWORD is set as plaintext — use STAFF_PASSWORD_HASH for production"
            echo "         Generate: node -e \"const b=require('bcrypt');b.hash('YOUR_PW',12).then(console.log)\""
        fi
    else
        fail "Neither STAFF_PASSWORD_HASH nor STAFF_PASSWORD is set in admin/.env"
    fi
fi

# ── 4. DOMAIN configured ──────────────────────────────────────
echo ""
echo -e "${BOLD}[4] Domain${NC}"
if [ -z "$DOMAIN" ]; then
    fail "DOMAIN is not set — add DOMAIN=your-library-domain.org to .env or export it"
else
    pass "DOMAIN is set: $DOMAIN"

    # ── 5. DNS resolution ─────────────────────────────────────
    echo ""
    echo -e "${BOLD}[5] DNS resolution${NC}"
    SERVER_IP=$(curl -fss --max-time 5 https://api.ipify.org 2>/dev/null || true)
    DOMAIN_IP=$(dig +short "$DOMAIN" 2>/dev/null | tail -1 || true)

    if [ -z "$DOMAIN_IP" ]; then
        fail "Cannot resolve $DOMAIN — DNS A record not set or not propagated yet"
    else
        pass "$DOMAIN resolves to $DOMAIN_IP"
        if [ -n "$SERVER_IP" ] && [ "$SERVER_IP" = "$DOMAIN_IP" ]; then
            pass "Domain IP matches this server's public IP ($SERVER_IP) ✓"
        elif [ -n "$SERVER_IP" ]; then
            warn "Domain IP ($DOMAIN_IP) ≠ server IP ($SERVER_IP) — DNS may not be pointed here yet"
        fi
    fi
fi

# ── 6. Required files present ─────────────────────────────────
echo ""
echo -e "${BOLD}[6] Required files${NC}"
for f in docker-compose.yml docker-compose.prod.yml docker/Dockerfile docker/nginx.conf \
         docker/docker-entrypoint.sh scripts/get-cert.sh; do
    [ -f "$f" ] && pass "$f" || fail "$f is MISSING"
done

# ── 7. Site data files readable ───────────────────────────────
echo ""
echo -e "${BOLD}[7] Data files${NC}"
for f in site/data/events.json site/data/announcements.json site/data/content.json; do
    if [ -f "$f" ]; then
        if python3 -c "import json; json.load(open('$f'))" 2>/dev/null; then
            pass "$f (valid JSON)"
        else
            fail "$f exists but is invalid JSON"
        fi
    else
        warn "$f not found — will use defaults on first admin login"
    fi
done

# ── Summary ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}================================================${NC}"
echo -e "  PASS: ${GREEN}${PASS}${NC}   WARN: ${YELLOW}${WARN}${NC}   FAIL: ${RED}${FAIL}${NC}"
echo -e "${BOLD}================================================${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}✗ Fix the ${FAIL} failure(s) above before deploying.${NC}"
    exit 1
elif [ "$WARN" -gt 0 ]; then
    echo -e "${YELLOW}⚠ ${WARN} warning(s) — review before going live.${NC}"
    echo -e "${GREEN}You may deploy, but address the warnings soon.${NC}"
    exit 0
else
    echo -e "${GREEN}✓ All checks passed — ready to deploy!${NC}"
    echo ""
    echo "  Run:"
    echo "    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
    echo "    bash scripts/get-cert.sh ${DOMAIN:-<your-domain>} <admin@email>"
    exit 0
fi
