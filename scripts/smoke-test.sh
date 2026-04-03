#!/usr/bin/env bash
# Requirement ID: SPEC-INFRA-001
# Purpose: post-deployment smoke tests — verify the live site is healthy.
# Run from the repo root AFTER docker compose is up and get-cert.sh has completed.
# Usage: bash scripts/smoke-test.sh [domain[:port]]
#   Local dev:  bash scripts/smoke-test.sh localhost:8443
#   Production: bash scripts/smoke-test.sh fayette.lib.wv.us
# ================================================================
set -euo pipefail

TARGET="${1:-${DOMAIN:-localhost}}"
# Strip any trailing slash
TARGET="${TARGET%/}"

# If no port given and target is localhost, default to dev port
if [[ "$TARGET" == localhost* ]] && [[ "$TARGET" != *:* ]]; then
    TARGET="localhost:8443"
fi

HTTPS_BASE="https://${TARGET}"
HTTP_BASE="http://${TARGET}"
# For local dev with --insecure; for prod don't skip verify
[[ "$TARGET" == localhost* ]] && CURL_TLS="-k" || CURL_TLS=""

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0

pass() { echo -e "  ${GREEN}✓${NC} $*"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $*"; ((FAIL++)); }

check_url() {
    local label="$1" url="$2" expected_status="${3:-200}"
    local status
    status=$(curl -s $CURL_TLS -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    if [ "$status" = "$expected_status" ]; then
        pass "${label} → HTTP ${status}"
    else
        fail "${label} → got HTTP ${status}, expected ${expected_status}  (${url})"
    fi
}

check_header() {
    local label="$1" url="$2" header="$3"
    if curl -sI $CURL_TLS --max-time 10 "$url" 2>/dev/null | grep -qi "$header"; then
        pass "${label}"
    else
        fail "${label} — header not found: ${header}"
    fi
}

check_body() {
    local label="$1" url="$2" pattern="$3"
    if curl -s $CURL_TLS --max-time 10 "$url" 2>/dev/null | grep -qi "$pattern"; then
        pass "${label}"
    else
        fail "${label} — pattern not found in response: ${pattern}"
    fi
}

echo ""
echo -e "${BOLD}================================================${NC}"
echo -e "${BOLD}  FCPL Smoke Tests — ${TARGET}${NC}"
echo -e "${BOLD}================================================${NC}"
echo ""

# ── Public site pages ─────────────────────────────────────────
echo -e "${BOLD}[1] Public Site Pages (HTTPS)${NC}"
check_url  "Homepage"              "${HTTPS_BASE}/"
check_url  "404 page"             "${HTTPS_BASE}/nonexistent-page-xyz" "404"
check_url  "Locations page"       "${HTTPS_BASE}/pages/locations.html"
check_url  "Events page"          "${HTTPS_BASE}/pages/events.html"
check_url  "Programs page"        "${HTTPS_BASE}/pages/programs.html"
check_url  "About page"           "${HTTPS_BASE}/pages/about.html"
check_url  "Digital Resources"    "${HTTPS_BASE}/pages/digital-resources.html"
check_url  "Jobs page"            "${HTTPS_BASE}/pages/jobs.html"

# ── Static assets ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}[2] Static Assets${NC}"
check_url  "CSS loads"            "${HTTPS_BASE}/css/style.css"
check_url  "JS loads"             "${HTTPS_BASE}/js/main.js"
check_url  "Favicon"              "${HTTPS_BASE}/favicon.ico"
check_url  "events.json"          "${HTTPS_BASE}/data/events.json"
check_url  "content.json"         "${HTTPS_BASE}/data/content.json"

# ── Redirects ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[3] URL Redirects${NC}"
check_url  "jobs.html redirect"      "${HTTPS_BASE}/jobs.html"      "301"
check_url  "about.html redirect"     "${HTTPS_BASE}/about.html"     "301"
check_url  "programs.html redirect"  "${HTTPS_BASE}/programs.html"  "301"
check_url  "locations.html redirect" "${HTTPS_BASE}/locations.html" "301"

# ── Security headers ──────────────────────────────────────────
echo ""
echo -e "${BOLD}[4] Security Headers${NC}"
check_header "HSTS header present"            "${HTTPS_BASE}/" "Strict-Transport-Security"
check_header "X-Frame-Options: SAMEORIGIN"    "${HTTPS_BASE}/" "X-Frame-Options"
check_header "X-Content-Type-Options: nosniff" "${HTTPS_BASE}/" "X-Content-Type-Options"
check_header "Content-Security-Policy"        "${HTTPS_BASE}/" "Content-Security-Policy"
check_header "Referrer-Policy"                "${HTTPS_BASE}/" "Referrer-Policy"

# HSTS must have max-age (not just the header being present)
HSTS_VAL=$(curl -sI $CURL_TLS --max-time 10 "${HTTPS_BASE}/" 2>/dev/null \
    | grep -i "Strict-Transport-Security" | head -1 || true)
if echo "$HSTS_VAL" | grep -qi "max-age=3153"; then
    pass "HSTS max-age=31536000 (1 year)"
else
    fail "HSTS max-age is missing or too short: ${HSTS_VAL}"
fi

# ── Admin portal ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}[5] Admin Portal${NC}"
check_url  "Admin login page loads"  "${HTTPS_BASE}/admin/"          "200"
check_url  "Admin login API exists"  "${HTTPS_BASE}/admin/api/auth/login" "405"

# Login with wrong creds should return 401 (not 500)
LOGIN_STATUS=$(curl -s $CURL_TLS -o /dev/null -w "%{http_code}" \
    -X POST "${HTTPS_BASE}/admin/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"password":"smoke-test-wrong-password"}' \
    --max-time 10 2>/dev/null || echo "000")
if [ "$LOGIN_STATUS" = "401" ]; then
    pass "Admin auth returns 401 for wrong password (not 500)"
else
    fail "Admin auth returned ${LOGIN_STATUS} for wrong password — expected 401"
fi

# ── TLS certificate ───────────────────────────────────────────
if [[ "$TARGET" != localhost* ]]; then
    echo ""
    echo -e "${BOLD}[6] TLS Certificate${NC}"
    CERT_INFO=$(echo | openssl s_client -connect "${TARGET}:443" -servername "${TARGET%%:*}" \
        2>/dev/null | openssl x509 -noout -issuer -enddate 2>/dev/null || true)
    ISSUER=$(echo "$CERT_INFO" | grep "issuer=" | head -1 || true)
    EXPIRY=$(echo "$CERT_INFO" | grep "notAfter=" | head -1 || true)

    if echo "$ISSUER" | grep -qi "Let's Encrypt\|ISRG\|R3\|R10\|R11"; then
        pass "Certificate issued by Let's Encrypt: ${ISSUER}"
    elif [ -n "$ISSUER" ]; then
        fail "Certificate is NOT from Let's Encrypt — run scripts/get-cert.sh first: ${ISSUER}"
    else
        fail "Could not retrieve certificate info (TLS handshake failed?)"
    fi

    if [ -n "$EXPIRY" ]; then
        pass "Certificate expiry: ${EXPIRY}"
    fi
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo -e "${BOLD}================================================${NC}"
echo -e "  PASS: ${GREEN}${PASS}${NC}   FAIL: ${RED}${FAIL}${NC}"
echo -e "${BOLD}================================================${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}✗ ${FAIL} check(s) failed — site is not fully healthy.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ All smoke tests passed — site is live and healthy!${NC}"
    exit 0
fi
