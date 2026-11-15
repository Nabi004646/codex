Current release: [200,000 searchable listings](catalog-200k-release.md). The following notes describe an earlier release.

# Historical release

The current release is documented in [search and content update](search-and-content-update.md): 122,614 listings, corrected region browsing, 12 working templates and eight additional guides. The notes below describe the preceding release.

# Catalog, languages and search navigation

The searchable discovery catalog contains92,614 unique canonical-URL listings,
including42 enriched editorial entries and92,572 community discovery entries.
Current official-source checks remain recorded for20 editorial entries. A listing
count is separate from independent review, database publication and SEO approval.

## Catalog provenance

The expansion adds54,381 whole GitHub project records selected from OpenDORS
v2025-11, then removes four additional canonical duplicates against the editorial
catalog. Each new selection has a recorded accessible main repository, a recognized
FOSS license at confidence95+, programming-language metadata and an update since2010.
These are historical metadata checks, not current device tests or security audits.
The UI shows snapshot dates, recorded license facts and “Check terms.”

OpenDORS metadata is credited to Stephan Druskat/German Aerospace Center(DLR),
CC BY4.0, DOI10.5281/zenodo.17560612. The source archive MD5 is verified before
selection. Public attribution, changes and the license link are shown on `/sources`;
a supplied notice is included in `/catalog-notices/OPENDORS-NOTICE.txt`.
No linked project code is redistributed. Unknown facts are not inferred.

`data/discovery-seed.json.gz` pins the compact source input. The selection and
merge tools are in `scripts/catalog/`. Builds regenerate hashed static shards and
common-query snapshots with `npm run prepare:catalog`; they make no provider calls.
Generated catalog assets are excluded from Git. Full-index queries run in a browser
worker; Cloudflare requests read only small common-query snapshots. Four retired
candidate IDs remain lookup aliases after canonical deduplication.

## Interface languages

English remains the default. Interface messages are available in English,
Spanish, Brazilian Portuguese, Hindi, Indonesian, French, German, Arabic,
Japanese, Vietnamese and Nepali. Preferences persist in a functional cookie and
localStorage; browser language and approximate country produce a suggestion only.
The language picker is present in public headers and mobile category navigation.
Arabic uses RTL; original product names, URLs and English content retain appropriate
language/direction isolation. Dates and counts use Intl formatting.

These are interface translations, not11 complete translated editorial catalogs.
Descriptions, guides and legal content retain an explicit English fallback.
No fake localized pages or hreflang alternates are generated. Public language
preferences do not affect the private English admin login or its MFA/locking gates.

## Navigation and privacy

The black status bar and public report links are removed. `/preview/*` returns404
in staging and production before provider requests; private reports remain within
the owner administration. No admin activation information is rendered publicly.

Search submission, command search, suggestions and pagination scroll to the
resolved results after the latest request wins. A focused results region supports
keyboard continuation; reduced-motion users get immediate scrolling. Typing into
the search field does not repeatedly steal focus. A minimum results area allows a
single match to align below the sticky header.

## Validation and release limits

Run `npm run build:pages`, `npm run check` and `git diff --check`. Checks cover
source hashes/counts, canonical URL/ID uniqueness, legacy ID lookup aliases,
multilingual search intents,11 language dictionaries, query bounds, private report
404s, cookie-aware SSR language/RTL and cache isolation. Browser QA checks new
repository search, exact result scrolling, language persistence and overflow.

No Supabase writes, migrations, password resets, auth permission changes, template
storage publication or SEO approvals are included. The existing20 source checks
are not expanded merely by importing metadata. The catalog stays noindex until
its separate editorial and public-page release gates are completed.
