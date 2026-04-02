# Page Maintenance Guide

This guide maps each public page to its intent, typical dependencies, and verification checks.

## Shared Contract
- Requirement ID: SPEC-PAGE-001
- Purpose: static content delivery with optional runtime hydration from shared JSON.
- Inputs: static HTML, css/style.css, js/main.js, and data/content.json where applicable.
- Outputs: patron-facing information pages.
- Preconditions: assets and data files are accessible from site root.
- Postconditions: page loads with navigation, footer, and accessibility controls intact.
- Assumptions: shared header/footer hook conventions remain unchanged.
- Side Effects: none server-side; optional analytics events client-side.
- Failure Modes: missing data keys, broken links, image path drift.
- Error Handling: fail-soft rendering and visible fallback content.
- Constraints: no framework build pipeline.
- Verification: keyboard nav, link checks, and mobile viewport pass.

## Page Matrix
- site/index.html: homepage, announcements, featured links, quick access tiles.
- site/pages/about.html: organizational info and contact context.
- site/pages/archives.html: archives/genealogy-focused content.
- site/pages/bookmobile.html: outreach schedule and service summary.
- site/pages/catalog.html: catalog search entry and reference links.
- site/pages/ebooks.html: digital lending and online resource links.
- site/pages/homebound.html: homebound service process and contact flow.
- site/pages/jobs.html: active job postings and application guidance.
- site/pages/locations.html: branch addresses, hours, and location details.
- site/pages/myaccount.html: patron account access and support guidance.
- site/pages/news.html: announcements/news feed presentation.
- site/pages/programs.html: umbrella programs/events navigation.
- site/pages/programs-adults.html: adult program details.
- site/pages/programs-children.html: children program details.
- site/pages/programs-community.html: community program details.
- site/pages/programs-teens.html: teen program details.
- site/pages/research.html: homework and research resources.

## Editing Rules for Maintainers
1. Update content through admin portal whenever possible.
2. If editing HTML directly, preserve shared nav, skip-link, and footer patterns.
3. Validate links and image paths after every direct HTML edit.
4. Keep text alternatives and heading order accessible.
5. Record changed pages in commit message and verify on desktop/mobile.

## Related References
- docs/FILE_LEVEL_SPECIFICATIONS.md
- docs/COMMENTING_STANDARD.md
- docs/MAINTENANCE_PLAYBOOK.md
