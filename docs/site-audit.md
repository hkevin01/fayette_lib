# Fayette County Public Libraries — Original Site Audit
**Audit Date:** 2026-03-23  
**Auditor:** Static site rebuild project  
**Original URL:** https://fayette.lib.wv.us/  
**CMS:** WordPress (Beaver Builder page builder) + The Events Calendar (tribe_events)  
**Hosting:** WVNET (West Virginia Network for Educational Telecomputing)

---

## 1. Executive Summary

The original FCPL website is a WordPress-powered site built with the Beaver Builder page builder. It contains **29 publicly discoverable URLs** (discovered via `wp-sitemap.xml`), though many are placeholder, staff-only, or under-construction pages. The site serves five library branches across Fayette County, WV.

**Key Findings:**
- The public-facing site has ~12 genuinely useful public pages
- 2 pages are staff-only (intranet, shared-files — password-protected)
- 1 page is a placeholder ("under construction")
- 1 page has a URL typo: `/search-caralog/` (should be "catalog")
- Several pages exist as WordPress framework artifacts (my-account, events taxonomy pages, sample-page)
- The Events Calendar plugin is in use with bookmobile stop events tracked
- No dedicated news/blog archive page exists despite 2 blog posts
- The archives page mentions microfilm, yearbooks, newspapers, magazines, family collections, and West Virginia Collection — important genealogy resources not featured elsewhere

---

## 2. Complete URL Inventory (29 URLs)

### 2.1 Static Pages (23)

| # | URL | Last Modified | Public? | Content Summary |
|---|-----|--------------|---------|-----------------|
| 1 | `/` | 2026-03-23 | ✅ | Homepage with hero, announcements, quick links |
| 2 | `/about-us/` | 2025-11-14 | ✅ | Mission, services, board, FAQ |
| 3 | `/programs-and-events/` | 2026-02-24 | ✅ | Programs calendar with event listings |
| 4 | `/locations/` | 2021-07-06 | ✅ | Branch locations (minimal content, old date) |
| 5 | `/research-and-homework/` | 2025-10-29 | ✅ | Database links, homework help resources |
| 6 | `/ebooks/` | 2021-05-21 | ✅ | Digital media: Libby, Hoopla, Kanopy, etc. |
| 7 | `/jobs/` | 2026-03-19 | ✅ | Current job listings (actively updated) |
| 8 | `/homebound-program/` | 2023-08-31 | ✅ | Homebound delivery service information |
| 9 | `/bookmobile-2/` | 2026-02-11 | ✅ | Bookmobile schedule and route information |
| 10 | `/bookmobile-calendar/` | 2026-01-03 | ✅ | Dedicated calendar with bookmobile stop events |
| 11 | `/events/` | 2025-12-02 | ✅ | Main events calendar (The Events Calendar plugin) |
| 12 | `/events/locations/` | 2021-07-12 | ⚠️ | WP Events Calendar taxonomy page (plugin artifact) |
| 13 | `/events/categories/` | 2021-07-12 | ⚠️ | WP Events Calendar taxonomy page (plugin artifact) |
| 14 | `/events/tags/` | 2021-07-12 | ⚠️ | WP Events Calendar taxonomy page (plugin artifact) |
| 15 | `/events/my-bookings/` | 2021-07-12 | ⚠️ | WP Events Calendar user bookings (login required) |
| 16 | `/archives/` | 2025-09-04 | ✅ | Historical archives: microfilm, yearbooks, newspapers, WV Collection |
| 17 | `/search-caralog/` | 2024-03-28 | ✅ | **TYPO in URL** — Catalog search embed (minimal content found) |
| 18 | `/my-account/` | 2021-05-21 | ⚠️ | WordPress account page (appears empty) |
| 19 | `/posts/` | 2022-06-22 | ✅ | Blog post listing (2 posts total) |
| 20 | `/sample-page/` | 2021-02-19 | ❌ | WordPress default placeholder page |
| 21 | `/under-construction/` | 2021-06-30 | ❌ | "Pardon the mess! We're still under construction!" |
| 22 | `/intranet/` | 2026-01-05 | 🔒 | Staff-only — password protected |
| 23 | `/shared-files/` | 2026-01-06 | 🔒 | Staff-only — staff forms & documents (password not required) |

**Legend:** ✅ Public content | ⚠️ Plugin artifact or login-required | ❌ Placeholder | 🔒 Staff-only

### 2.2 Blog Posts (2)

| # | URL | Date | Title |
|---|-----|------|-------|
| 1 | `/2021/07/board-of-trustees-meeting-july-14th/` | 2021-07-07 | Board of Trustees Meeting May 13 at... |
| 2 | `/2026/02/job-opportunity-...` | 2026-02-09 | Job opportunity — check Jobs tab |

### 2.3 Event Pages (4)

| # | URL | Event | Date |
|---|-----|-------|------|
| 1 | `/events/library-closed-2/` | Library Closed | TBD |
| 2 | `/events/library-closed-for-christmas/` | Library Closed for Christmas | December 24, 8:00 am – 5:00 pm |
| 3 | `/events/library-closed-for-christmas-2/` | Library Closed for Christmas | TBD |
| 4 | `/events/library-closed-for-christmas-3/` | Library Closed for Christmas | TBD |

---

## 3. Site Statistics

| Metric | Value |
|--------|-------|
| Total URLs in sitemap | 29 |
| Public content pages | ~12 |
| Staff-only pages | 2 |
| Placeholder/artifact pages | 7 |
| Blog posts | 2 |
| Events in sitemap | 4 |
| Library branches represented | 5 |
| CMS | WordPress + Beaver Builder |
| Events plugin | The Events Calendar (tribe_events) |
| Site theme | Beaver Builder Theme |
| Last homepage update | 2026-03-23 |
| Most recently updated page | `/` (homepage, 2026-03-23) |
| Least recently updated page | `/sample-page/` (2021-02-19) |

---

## 4. Content Inventory by Page

### Homepage (`/`)
- Hero section with library name and tagline
- Announcements (dynamic, managed via WP)
- Quick links grid
- Programs and events calendar embed
- Contact information
- Footer with all branch info

### About Us (`/about-us/`)
- Mission statement
- Library services list (free and fee-based)
- Patron policy
- FAQ section
- Board of Trustees / Directors information

### Programs & Events (`/programs-and-events/`)
- Event listings using The Events Calendar plugin
- Categories: children, adult, teen, community
- Last updated: 2026-02-24

### Locations (`/locations/`)
- Branch information
- **Note:** Last modified 2021-07-06 — possibly outdated content

### Research & Homework Help (`/research-and-homework/`)
- Database links (WV Info Depot, statewide resources)
- Homework help resources
- Last updated: 2025-10-29

### eBooks (`/ebooks/`)
- Libby by OverDrive
- Hoopla Digital
- Other digital services
- Last updated: 2021-05-21 — possibly outdated

### Jobs (`/jobs/`)
- Current job listings
- **Actively updated** — last modified 2026-03-19

### Homebound Program (`/homebound-program/`)
- Program description and eligibility
- Application instructions
- Contact information
- Last updated: 2023-08-31

### Bookmobile (`/bookmobile-2/`) + Calendar (`/bookmobile-calendar/`)
- Route information
- Stop schedule by school/location
- Separate calendar page with The Events Calendar embed
- Bookmobile stops tracked as events (e.g., "Oak Hill High School 12:55–1:40", "Divide Elementary 7:30–10:00")
- Last updated: 2026-02-11 / 2026-01-03

### Archives (`/archives/`)
- Tabbed interface with categories:
  - **Microfilm** — link to archive collection document (ARCHIVE-COLLECTION-1.docx)
  - **Yearbooks**
  - **Newspapers** (Bound & Loose)
  - **Magazines**
  - **Family Collections**
  - **The West Virginia Collection**
  - **Miscellaneous**
- Last updated: 2025-09-04

### Catalog Search (`/search-caralog/`) — NOTE: URL has typo
- Appears to be a simple catalog search page (minimal scraped content)
- Likely embeds WV Info Depot catalog search

### Staff Intranet (`/intranet/`)
- **Password-protected** — not publicly accessible

### Shared Files (`/shared-files/`)
- **Staff-only section** (not login-protected but staff-facing)
- Contains downloadable forms:
  - **Monthly Reports:** Circulation Sheet, Circulation Report Form, Library Monthly Money Chart, Fines/Petty Cash, Fax Log, Interlibrary Loans Chart
  - **Program Forms:** Program Attendance Form, Maintenance Log, New Book Count, Notary Log
  - **Administrative/Misc:** Daily Count Sheet, Leave Request Form, Timesheet, Fax Cover Page, Book Reconsideration Form, New Book Order Form, Jeans Purchase Form, Receipts, Program Planning Form, Memorial Donation Form, Library Card Letters, Daily Cash Drawer Sheet, Missing Info Form, Library Contact List (inner use only)
  - **Safety:** Accident Injury Report, Employee Evaluation Form, Employee Warning Notice
  - **Onboarding/Patron:** Homebound Application, WV Deli Checklist, Libby guide, Storytime Registration, Photo Release Form
  - **Library Materials:** Library Brochure, General Complaint Form, Donating Books info, Library Card Attachment letters
  - **ILL (Interlibrary Loan):** Sending form, Thank You note, Checkout form, ALA-approved ILL request, Overdue letter, Mailing label, Return label
- File formats: .xlsx, .docx, .doc, .pdf, .xls

---

## 5. Technology Stack

| Component | Version/Details |
|-----------|-----------------|
| CMS | WordPress |
| Page Builder | Beaver Builder (Pro) |
| Events Plugin | The Events Calendar (tribe_events post type) |
| Hosting | WVNET |
| SSL | Yes (HTTPS) |
| Logo format | PNG (cropped-logo-2-300x148.png) |
| Sitemap | wp-sitemap.xml (WordPress auto-generated) |

---

## 6. Navigation Structure (Original)

**Main menu items identified (from page headers):**
1. Home
2. About Us
3. Programs & Events
4. Locations
5. Research & Homework
6. eBooks
7. Jobs
8. Homebound Program
9. Bookmobile
10. Archives (in some navigation variants)
11. My Account (links to WVIB catalog)

---

## 7. Notable Content Not in Original Navigation

These pages exist but were not surfaced in main navigation or were hard to find:

- `/archives/` — rich genealogy/research content, should be prominently linked
- `/bookmobile-calendar/` — separate from main bookmobile page
- `/search-caralog/` — URL typo makes this effectively hidden from users
- `/posts/` — 2 blog posts exist but no prominent link

---

## 8. Accessibility Assessment (Original Site)

The original WordPress/Beaver Builder site has **significant accessibility gaps:**

| Issue | WCAG Criterion | Severity |
|-------|---------------|----------|
| No visible skip link | 2.4.1 Bypass Blocks | High |
| Low color contrast on tagline text | 1.4.3 Contrast (Minimum) | High |
| Images may lack alt text | 1.1.1 Non-text Content | High |
| Tab navigation not keyboard-accessible for events calendar | 2.1.1 Keyboard | High |
| No font size controls for elderly users | 1.4.4 Resize Text (user-controllable) | Medium |
| No high-contrast mode | 1.4.11 Non-text Contrast | Medium |
| No reduced-motion support | 2.3.3 Animation from Interactions | Medium |
| Forms lack explicit ARIA roles | 1.3.1 Info and Relationships | Medium |
| Navigation links too small on mobile (< 44px targets) | 2.5.5 Target Size | Medium |
| No aria-live regions for dynamic calendar content | 4.1.3 Status Messages | Medium |

---

## 9. Gaps Identified vs. Our Static Rebuild

Pages/features in original site **not initially in our rebuild** (now addressed):

| Original Feature | Status in Rebuild |
|-----------------|-------------------|
| Archives page (microfilm, yearbooks, WV Collection) | ✅ Added as `pages/archives.html` |
| Catalog search page | ✅ Added as `pages/catalog.html` |
| News/blog posts listing | ✅ Added as `pages/news.html` |
| Bookmobile as separate calendar page | ✅ Integrated into `pages/bookmobile.html` |
| "Library Closed" holiday events | ✅ Added to `data/events.json` |
| Staff intranet | ❌ Out of scope (password-protected, staff-only) |
| Staff shared files | ❌ Out of scope (staff-only forms) |
| My Account (WP login) | ➡️ Link redirects to WV Info Depot catalog |
| Events taxonomy pages | ❌ Plugin artifacts, no equivalent needed |
| Sample/under-construction pages | ❌ Placeholder pages, no equivalent needed |

---

## 10. Recommendations

1. **Fix the URL typo** — `/search-caralog/` should redirect to a proper `/catalog/` or `/search-catalog/` URL
2. **Surface the Archives page** prominently — it contains valuable genealogy resources
3. **Update the Locations page** — last modified 2021, likely has outdated hours/info
4. **Consolidate the Bookmobile pages** — two separate pages (`/bookmobile-2/` and `/bookmobile-calendar/`) creates user confusion
5. **Create a proper News/Blog section** — only 2 posts currently, but important for library announcements
6. **Add accessibility toolbar** — font size controls + high contrast mode for elderly patrons
7. **WCAG 2.1 AA compliance** — minimum for ADA compliance; recommended for all public-sector websites
8. **Consider the Archives content** — adding to the Research page or creating a prominent Archives section
9. **Staff shared files** — these should be properly password-protected (currently accessible without login)

---

*Document generated as part of the FCPL static site rebuild project.*  
*All URLs scraped from `https://fayette.lib.wv.us/wp-sitemap.xml` on 2026-03-23.*
