# Requirement ID: SPEC-INFRA-001
# Purpose: build immutable runtime image for admin API and UI shell.
# Rationale: reproducible deploy artifact with minimal runtime dependencies.
# Inputs: package.json, server.js, public assets.
# Outputs: Node container exposing admin backend on port 3000.
# Preconditions: valid npm registry access during build.
# Postconditions: image can serve /admin static UI and /admin/api routes.
# Constraints: production-only dependencies, no build toolchain required.
# Verification: container starts and admin login path responds through nginx proxy.
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY server.js ./
COPY public/ ./public/
EXPOSE 3000
CMD ["node", "server.js"]
