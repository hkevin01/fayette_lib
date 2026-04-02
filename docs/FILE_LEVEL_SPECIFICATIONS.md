# File-Level Specifications

This file provides requirement-style contracts for core files.

## Spec Format
- Requirement ID
- Purpose and rationale
- Inputs and outputs
- Preconditions and postconditions
- Assumptions and side effects
- Failure modes and error handling
- Constraints and verification
- Related requirements

---

## SPEC-API-001: admin/server.js
- Purpose: provide authenticated staff API, content persistence, and system endpoints.
- Rationale: central backend for all mutable data and admin operations.
- Inputs: HTTP requests, JWT bearer token, JSON request bodies, environment variables.
- Outputs: JSON responses, updated files in site/data, audit and backup side effects.
- Preconditions:
  - valid runtime env vars (JWT secret and staff password/hash)
  - writable DATA_DIR and IMAGES_DIR
- Postconditions:
  - sanitized writes only
  - atomic file replacement for writes
  - audit trail entry for mutating actions
- Assumptions:
  - reverse proxy in front provides stable network path
  - JSON files remain valid UTF-8 JSON
- Side effects:
  - content/events/analytics file mutations
  - backup file creation
  - audit log append
- Failure modes:
  - file permission denied
  - malformed JSON input
  - invalid token
  - upstream live-host probe timeout
- Error handling:
  - structured 4xx/5xx responses
  - bounded body parser and sanitization
  - route-level try/catch for I/O operations
- Constraints:
  - no direct unsanitized write paths
  - no stack trace leakage in API responses
- Verification:
  - route smoke test by section
  - mutation path confirms backup + audit
- Related requirements: SPEC-DATA-001, SPEC-SEC-001

## SPEC-UI-001: admin/public/index.html
- Purpose: single-file admin interface for staff operations.
- Rationale: simple deploy model without build tooling.
- Inputs: API responses, user actions, form and modal input.
- Outputs: rendered admin state, API write requests, toast notifications.
- Preconditions:
  - authenticated API token in browser storage
  - admin API reachable under /admin/api
- Postconditions:
  - UI reflects latest saved state
  - failed actions show user-readable message
- Assumptions:
  - modern browser with fetch support
- Side effects:
  - server writes through API endpoints
- Failure modes:
  - stale token
  - API outage
  - partial live-host discovery response
- Error handling:
  - catch blocks with non-blocking toast alerts
- Constraints:
  - maintain tab-based navigation and no build step
- Verification:
  - click-path test per tab
  - save/edit/cancel behavior on hosting editor boxes
- Related requirements: SPEC-API-001, SPEC-A11Y-001

## SPEC-FE-001: site/js/main.js
- Purpose: hydrate public pages from content JSON and manage shared site behavior.
- Rationale: avoid server-side templating and keep pages static.
- Inputs: content.json, events.json, DOM, browser storage.
- Outputs: rendered page sections, accessible nav behavior, analytics events.
- Preconditions:
  - data files available from site/data
- Postconditions:
  - core sections render with safe fallbacks when data is missing
- Assumptions:
  - static HTML IDs/hooks remain stable
- Side effects:
  - writes analytics events to admin API endpoint when enabled
- Failure modes:
  - network failure for content files
  - missing DOM hooks on a page
- Error handling:
  - defensive checks and fail-soft rendering
- Constraints:
  - no framework/runtime build requirement
- Verification:
  - smoke test across home, programs, locations, news
- Related requirements: SPEC-A11Y-001

## SPEC-CAL-001: site/js/calendar.js
- Purpose: render event calendar views and event export links.
- Rationale: present event information without external calendar dependency.
- Inputs: events.json payload and user-selected filters.
- Outputs: month/list rendering, modal event details, ICS and Google links.
- Preconditions:
  - valid event timestamps in data feed
- Postconditions:
  - interactive event browse experience with keyboard support
- Assumptions:
  - browser Date parsing supports ISO-like timestamps used in data
- Side effects:
  - none server-side
- Failure modes:
  - invalid event date formats
  - empty event list
- Error handling:
  - no-crash rendering, empty-state UI
- Constraints:
  - keep dependency-free implementation
- Verification:
  - list/month parity and export link checks
- Related requirements: SPEC-A11Y-001

## SPEC-INFRA-001: docker-compose.yml and docker/nginx.conf
- Purpose: define runtime topology and routing/security controls.
- Rationale: reproducible deployment and defense-in-depth.
- Inputs: repository code, env file, mounted data/images/certs.
- Outputs: running website and admin containers with health checks.
- Preconditions:
  - available ports and Docker privileges
- Postconditions:
  - healthy containers and reachable endpoints
- Assumptions:
  - host filesystem mounts are persistent
- Side effects:
  - container/image lifecycle actions
- Failure modes:
  - bind permission errors
  - failed health checks
- Error handling:
  - restart policies and health check visibility
- Constraints:
  - preserve mount paths used by admin API and static site
- Verification:
  - docker compose ps, health logs, endpoint smoke tests
- Related requirements: SPEC-API-001, SPEC-UI-001

## SPEC-SEC-001: Security Baseline
- Purpose: ensure auth, sanitization, and transport controls remain intact.
- Verification baseline:
  - bcrypt/jwt auth path intact
  - rate limiting active at Nginx and Express layers
  - Helmet headers present
  - file uploads constrained by type and size

## SPEC-DATA-001: Data Integrity Baseline
- Purpose: avoid corruption and accidental data loss in mutable JSON content.
- Verification baseline:
  - writeJSON uses temp+rename strategy
  - destructive operations create backups
  - recycle bin retention behavior preserved

## SPEC-A11Y-001: Accessibility Baseline
- Purpose: preserve keyboard navigability and readable semantic structure.
- Verification baseline:
  - skip links, focus behavior, nav keyboard paths functional
  - content updates remain screen-reader understandable
