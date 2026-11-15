# Specification update — 15 November 2026

This update preserves the current site and the full discovery catalog. It does not represent completion of every requirement in the v2.5 specification. The baseline audits in `spec-audit-core.json` and `spec-audit-growth.json`, combined with `data/spec-implementation-updates.json`, are available to an authenticated owner in the admin feature audit.

## Available in this release

- English remains the default. An India country hint can offer Hindi even when the browser prefers English. There is no automatic language redirect. A saved language or **Keep English** takes precedence; clearing site preferences clears the locale cookie and storage keys.
- Guest toolkit folders support ordering, folder and resource notes, JSON/CSV import and export. Public share links exclude private notes. These folders remain browser-local.
- `/alternatives` and eight product guides explain specific free candidates, migration trials and compatibility limitations using primary documentation. They make no feature-parity or hands-on benchmark claim.
- `/workflows` and `/planner` provide ordered project steps, recorded resource choices, deliverables, private notes, browser saves, JSON/CSV exports, public-plan share links and Letter/A4 print or save-as-PDF.
- `/hubs/students`, `/hubs/creators` and `/hubs/small-business` contain original practical guides and first-project kits. Seven starter kits link into the directory and planning tools.
- The country-aware task finder extracts recorded platform, account, offline and access constraints, searches source-reviewed candidates first, and offers an explicit community-catalog option. Country availability remains unknown unless supported by evidence.
- `/selector` narrows a finite editorial shortlist; `/widgets` provides four read-only attributed iframe collections without personal state or script access to the embedding page.
- Matching resource social images, resource-link copying and platform chips improve resource sharing and navigation. Fourteen curated apps have 28 observed official Google Play/App Store links. Imported iOS and F-Droid rows retain their actual source links; no India availability is inferred.
- The private admin audit separates feature implementation, source approval, database publication and external indexing. A manual Search Console Performance CSV importer analyzes supplied data in page memory; it does not claim a live account connection or Google index status.
- The 100 original native template drafts are pinned in source as 240 files with checksums and a deterministic restoration command. Restoration does not upload or publish any template.

## Controlled public discovery mode

`ATLAS_MODE=public-discovery` preserves the 210,052-entry discovery search rather than replacing it with an empty published-database inventory. Only the canonical `freeresourceatlas.com` hostname uses this mode. Cloudflare preview hostnames remain noindex.

Seventeen reviewed English canonical pages are approved in `server/public-approvals.mjs`: the homepage, about, source methodology, author, alternatives index, eight alternatives guides, three audience hubs and the sourced GTA 6 release page. Their XML sitemap uses the same finite approval inventory. Query variants, translated UI variants, discovery resource pages, templates, admin and unreviewed pages remain excluded from this inventory. Sitemap inclusion is not proof of Google indexing.

This source-reviewed inventory is managed through Git. It is distinct from the existing protected database SEO approval workflow. Database inventory counts and lifecycle changes do not silently approve or retire source-managed URLs.

Cloudflare country hints come from its approximate country metadata; no precise-location permission is requested. Anonymous edge HTML cache keys are partitioned by that country hint. Responses containing browser language preferences are private and not publicly cached.

## Connections and release gates still required

The connected Supabase management account exposes the portfolio project, not this site's existing Free-library project. No portfolio data was modified. New database schema, protected Storage uploads, additional administrative actions and scheduled server jobs need authorized management access to Free-library and acceptance testing there. Existing public reads and existing protected publication actions are preserved.

Native template publication requires real Storage configuration, MIME and rights checks, public file metadata and download acceptance. All template upload, distribution and publication flags remain false/draft.

Search Console/Bing account synchronization, actual URL inspections and provider reporting need property authorization. Consent-aware analytics, zero-result aggregates, moderation delivery, email subscription/unsubscribe, operational monitoring and backup/restore acceptance are not represented by simulated successes. Reviewed translated content, reciprocal locale URLs, licensing records, new editorial cohorts and original hands-on reports need their own content work.

The feature audit intentionally continues to display partial and missing requirements. Eleven usable interface languages are enabled; five further language slots are recorded as planned rather than exposing untranslated controls.

## Verification

The dedicated specification tests cover language preference precedence, private-note share boundaries, CSV imports, saved ordering before pagination, documented access groups, workflow portability, supplied Search Console metrics, official store evidence, widget isolation and narrow source indexing. Runtime tests also verify country-separated caching, preservation of the discovery catalog, noindex translated UI/preview pages and the exact 17-URL sitemap.

Run `npm run build:pages` and `npm run check` for the full release checks. Browser acceptance covers the India choice, mobile controls and the new public workspaces. Live deployment checks must separately confirm the canonical hostname, robots, sitemap, APIs and protected admin boundary.
