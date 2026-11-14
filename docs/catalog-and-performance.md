> Historical checkpoint: the searchable catalog has since expanded. See [current delivery notes](searchable-catalog.md).

# Catalog and loading update — 14 November 2026

The deployment connected to this repository is still a staging catalog. The 90,000–100,000-resource goal has not been reached.

## Actual inventory at this checkpoint

| Inventory | Count | Meaning |
| --- | ---: | --- |
| Homepage preview resources | 42 | Local editorial drafts; separate from hosted publication |
| Published database resources | 0 | Confirmed through the existing public `catalog_stats` RPC on 14 November 2026 |
| Preserved legacy URL candidates | 38,239 | Unique URLs in the original checkpoint; freshness, terms and publication review remain pending |
| GitHub repositories within those candidates | 15,029 | A subset of the 38,239 candidates, not an additional count |
| Original template identities | 100 | Draft files and previews; hosted downloads remain unreleased |

The source lists and legacy candidate catalog remain preserved in the original full checkpoint. This frontend repository does not silently import, publish or index them. A useful next catalog milestone is a small authenticated draft import with exact before/after counts, duplicate handling and interruption/resume checks. The existing 1,000-record capacity checkpoint must be validated before expanding it.

## Loading fixes

The browser reproduced an admin rendering error: a lazy sign-in component suspended under the server's `renderToString` call. React abandoned that server boundary during hydration. The admin route now renders the same loading shell on the server and first browser render, then loads the private interface after mount. A fresh browser check displayed the email/password form without the prior application hydration error.

Authentication and catalog requests have a 15-second deadline covering the response body. Leaving or locking admin cancels pending work. Identity/generation checks prevent a late response from restoring an old client or grant. Password submissions and mutations are never automatically retried. Logout, hidden-tab/back/exit locks, MFA, short grants and backend authorization remain enforced. Real owner-authenticated MFA, expiry, import and password-change acceptance are not claimed by these local tests.

Search keeps existing cards visible during an update. Resource cards avoid unrelated input-driven rerenders. Sidebar geometry work is coalesced to one animation frame and unchanged geometry does not rewrite styles; missing ResizeObserver no longer throws. Unexpected render/chunk errors have a reload/return recovery screen. Motion respects reduced-motion and touch devices without changing the approved yellow layout.

The same two primary variable fonts were converted to WOFF2, retaining character maps and variation axes. Combined file sizes fell from 648,660 to 294,160 bytes (54.65%). Critical fonts are preloaded; original TTF files remain as fallbacks. This is an asset-size reduction, not a measured claim about Core Web Vitals or real-user speed.

## Feature delivery status

| Area | Available in code | Still requires completion |
| --- | --- | --- |
| Discovery | Dynamic search, categories/subcategories, filters, task finder, comparisons and browser toolkits | Real catalog import and search-quality/capacity checks |
| Administration | MFA gate, short access grants, draft CRUD, bulk-import preview/resume/counts, SEO controls, catalog progress | Owner-authenticated acceptance and private verification setup |
| SEO | Semantic rendering, metadata, approved-only XML inventory and editorial approval workflow | Public content release, approved index inventory and actual Search Console integration |
| Templates | 100 draft previews and searchable pages | Content/license approval, hosted file storage and published downloads |
| International browsing | Country/language preference foundation and English fallback | Reviewed translations and verified regional availability |

## Verification

`npm run check` covers model/public/runtime behavior and request/interaction regressions. `npm run build:pages` checks the actual compiled Pages module, including private admin headers, a clean non-suspending admin HTML shell, search and template APIs, no source exposure and staging noindex.

Browser checks verified Shotcut search, empty-result recovery, the Automation category, a Node-RED detail page and a fresh admin sign-in screen. The homepage had no horizontal overflow at the tested desktop viewport. Full mobile, real owner login, hosted load/concurrency and field performance checks remain pending. Browser-extension console errors were excluded from application diagnostics.

This update does not migrate the database, change DNS or credentials, import resources, enable production indexing, or release hosted template downloads.
