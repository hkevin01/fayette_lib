# Commenting Standard for FCPL

## Goal
Comments must explain intent and operational impact, not restate obvious code.

## Required Block for Major Modules
Use this block at module entry points and high-risk functions.

- Requirement ID
- Purpose
- Rationale
- Inputs
- Outputs
- Preconditions
- Postconditions
- Assumptions
- Side Effects
- Failure Modes
- Error Handling
- Constraints
- Verification
- References

## Example Template
Requirement ID: SPEC-API-001
Purpose: <what this block does>
Rationale: <why this is needed>
Inputs: <data accepted>
Outputs: <data emitted>
Preconditions: <must be true before execution>
Postconditions: <guarantees after execution>
Assumptions: <environment assumptions>
Side Effects: <state mutations>
Failure Modes: <known break paths>
Error Handling: <how failures are surfaced>
Constraints: <limits and non-goals>
Verification: <how to test>
References: <related spec IDs/docs>

## Practical Rules
- Add these blocks to core routes, data write helpers, and complex UI flows.
- Keep each block short enough to scan.
- If behavior changes, update comment block and related spec document in same commit.
- Do not add noisy comments on trivial assignments.

## Current Priority Files
- admin/server.js
- admin/public/index.html
- site/js/main.js
- site/js/calendar.js
- docker-compose.yml
