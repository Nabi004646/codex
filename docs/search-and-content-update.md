Current release: [200,000 searchable listings](catalog-200k-release.md). The following notes describe an earlier release.

# Search and content update — 15 November 2026

The searchable discovery catalog increases from 92,614 to 122,614 distinct
canonical-URL listings. The additional 30,000 are research repository leads,
selected from the attributed OpenDORS v2025-11 snapshot. They are not 30,000
independently reviewed consumer apps. Selection requires a source-recorded
accessible main repository, a referencing publication, language metadata and an
update since 2020. Generic test repositories are excluded. Existing IDs and
canonical duplicate aliases are preserved.

The new records retain historical dates, original destinations and research
references where present. Of the additions, 402 have high-confidence reported
license metadata and 29,598 have no qualifying license evidence. Missing facts
remain unknown. Neither the dataset's CC BY 4.0 license nor public GitHub visibility
licenses the linked project. Every addition displays **Check terms**; the count of
independently recorded official-source checks remains 20.

The pinned archive checksum and deterministic selection are implemented in
`scripts/catalog/collect-research-expansion.py`; the compressed merged input is
`data/discovery-seed.json.gz`. Provider calls are not needed during ordinary builds.
Attribution and the selection changes appear in the existing sources page.

## Storage and search

The bulk discovery metadata lives in the GitHub source seed. Build-time scripts
generate versioned JSON shards and common-query snapshots, served as static
Cloudflare Pages assets. The entire index is not included in the main JavaScript
bundle. Arbitrary searches run in a browser worker. Supabase remains the separate
authority for owner-managed publication and administration; this release performs
no Supabase import, migration or permission change. Spare Supabase capacity does
not describe how much Cloudflare catalog metadata is deployed.

Previously, any country selection forcibly returned zero discoveries. Country is
now a browsing preference where availability evidence is missing: matching global
results remain visible with an explicit unverified-availability notice. It does
not claim a resource works in the selected country. Common app queries have
server-rendered snapshots. Broad app searches prioritize recorded mobile-app facts, so a product need not contain the English word app in its name to appear. Region controls are inside the filters, and a loading
count is shown as an ellipsis rather than a misleading zero. An optional published
CMS section cannot display an unrelated outage above successful discovery results.
The actual published-resource API continues to report its own errors.

## Guides, templates and presentation

Eight new original guides cover app-source checks, keyboard accessibility,
reproducible project handovers, browser file-tool evaluation, citation notes,
editable-document/PDF handover, research repository evaluation and learning plans.
Each is approximately 500 words with a concrete exercise and original-source links.
The 16 guides now have distinct original SVG topic illustrations in their cards
and article pages. They are labeled illustrations, not provider screenshots.

Twelve new working templates open from `/templates/quick/<slug>`. Visitors can edit
fields and rows, clear fictional examples, add up to 40 rows, choose US Letter or
A4, print/save a PDF through the browser, or download a self-contained HTML file.
No template entries are uploaded or saved automatically. User content is escaped;
the preview cannot run scripts; the exported file has no scripts or remote assets.
The existing 100 document previews retain their separate file-publication state.

The native language control has a warm pill treatment, a language icon and a
direction-aware chevron. All 11 interface languages and persistence remain in
place. Filter values stay language-independent. Short result/card transitions
respect reduced-motion settings. Existing noindex, sitemap and admin/MFA rules
are preserved.

## Verification

Run `npm run build:pages`, `npm run check` and `git diff --check`.
The compiled Pages worker checks the exact `apps&country=US` regression, server
rendering, template editor routes, distinct titles and preserved private routes.
The catalog checks cover canonical/ID uniqueness, snapshots, full-index searches,
review labels and lookup aliases. Template checks cover all 12 schemas, Letter/A4
HTML exports, hostile text escaping and self-contained downloads. Browser
inspection was limited by the preview browser's URL-policy rejection; interactive
printing and download clicks were not fully verified in that browser.
