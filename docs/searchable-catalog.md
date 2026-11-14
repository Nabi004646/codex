# Searchable catalog delivery

The homepage previously used a 42-entry preview, independent of database imports. The directory now exposes **38,237 unique-URL listings** in the existing staging experience. The 90,000-resource goal has not been reached.

## Inventory and labels

| State | Listings |
| --- | ---: |
| Community discovery listings | 38,195 |
| Existing editorial entries | 42 |
| Total searchable listings | 38,237 |
| Editorial entries with a recorded official-source check | 20 |

The preserved source catalog contained 38,239 URLs. One malformed URL was excluded, six shortening/redirect links were withheld for destination review, and 37 URL overlaps were replaced by the enriched editorial entries. Distinct chapter/hash-route URLs remain distinct. These are unique URL listings, not a claim that every URL is a separate product or has been checked recently.

Discovery entries show “Check terms” and their source collection. Provider availability, individual licensing, pricing and hardware requirements remain unknown until reviewed. The original `published` labels in the legacy file are not treated as review or publication evidence. Imported descriptions are omitted from the compact index. Collection attribution and supplied CC BY/MIT notices are available through `/sources` and `/catalog-notices/`.

The v2.5 guide's Section 27G explicitly permits unreviewed listings to be searchable without creating standalone SEO pages or sitemap entries. Discovery cards open the original source. No 38,000-page HTML generation, automatic sitemap approval or database publication occurs. Staging stays noindex; production mode continues to use published Supabase records and approved metadata.

## Visible features

- The sidebar shows the complete discovery count and populated category/subcategory counts.
- The homepage has direct cards for the task finder, comparisons, toolkits and 100 template previews. The Explore menu exposes additional workflows.
- Short queries include useful matches for SEO, AI, reels/video work, automation, finance and fitness. “Earn money” retrieves related business/freelancing workflows without an income promise.
- Bookmarks, comparisons and toolkit lookup work with restored discovery IDs, not only the original 42 IDs.
- The optional source-check filter includes only entries with a recorded check date. Country/platform/requirement filters do not manufacture unknown evidence.
- The admin import workspace can prepare up to 100 entries from a selected category. The owner inspects the preview and explicitly adds valid rows as drafts through the existing MFA-protected backend. The initial 1,000-record database capacity checkpoint remains in place.
- GitHub import normalization preserves case-sensitive file paths and chapter/hash fragments. Canonical repository owner/name normalization is retained.
- A homepage section reads current published database entries independently, so new admin publications can appear without replacing the discovery index. No new hosted publication is claimed by this update.

The template shortcut is deliberately labeled previews: hosted document downloads remain unreleased. Reviewed translations and the remainder of the full project specification are still incomplete.

## Delivery architecture

Common searches and category entry pages use prepared JSON snapshots for fast server-rendered content. Arbitrary combinations and pagination run against sharded public metadata in a browser worker; heavy index decoding/ranking is not executed inside a Cloudflare request. The interface stays interactive while a search completes. It fetches relevant index shards rather than shipping all 39,000 descriptions into the main client bundle.

There are 303 versioned catalog assets: record shards, term postings, ID lookups, filter metadata and 191 prepared snapshots. The largest asset is about 1.3 MB; total catalog assets are about 19.5 MB. These are deployment/storage figures, not the initial page download size or measured field performance. No database, DNS, credentials, RLS, MFA, admin grants or private verification settings were changed.

The Pages worker defaults staging to discovery mode, even if the dashboard has not added the new variable. `ATLAS_CATALOG=editorial-only` is an explicit rollback option. Production mode retains its existing published-only database path. Direct staging API requests for arbitrary search combinations return `clientRequired` with HTTP 409; the site's search adapter transparently uses its worker. Published production API behavior remains unchanged.

The index is versioned and checked into GitHub. Normal builds validate/use those assets without needing the preserved source ZIP. To deliberately regenerate, run the two preparation scripts against the preserved original catalog, then validate and commit the new manifest and asset folder together. Supabase remains the authority for new owner-managed publication; the static discovery index is not a replacement for the protected CMS.

## Verification

`npm run check:discovery` verifies asset hashes, all 38,237 URL/ID entries, unknown/reviewed label separation, common and arbitrary searches, pagination, comparison lookup, 100 real category rows normalized as drafts, and import URL preservation. `npm run build:pages` checks the actual compiled worker with the expanded default mode, rendered count, prepared search responses, private admin headers and the absence of heavy index reads in request handling.

Browser checks verified the expanded count and feature links; a non-preset FastAPI query returned 21 matches. Two restored entries were compared, and a saved restored entry appeared in Toolkits. The task finder returned a source-checked Shotcut match for video editing. Real owner-authenticated import/publication, mobile field performance, hosted load/concurrency and template-file release remain separate acceptance work.
