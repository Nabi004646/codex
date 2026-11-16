# Keyword coverage release — 16 November 2026

All five supplied CSV exports were read. They contain 696 rows and 555 normalized unique keywords. The unnumbered export and `(3)` are byte-identical. One other term occurs across separate exports. No rows were silently dropped.

The unique audit maps 484 relevant keywords to 21 canonical destinations (19 specific guides, the GTA hub and the general guides index). The twentieth new guide adds related cybersecurity-topic coverage. The exported `mapped_pages` count is authoritative. Seventy-one queries are explicitly excluded with a reason. Exclusions include unrelated brand logins, unclear abbreviations, unreviewed providers, news/music queries unrelated to the directory and unsuitable media destinations. Exclusion does not mean the query has no demand.

`keyword-coverage-all-rows.csv` retains every input occurrence and its source row. `keyword-coverage-unique.csv` gives one row per normalized query. `summary.json` records reconciliation totals. Input “Impressions” is an unverified export metric, not measured site traffic, monthly search volume, indexed-page count or a ranking. The unique audit retains a maximum observation instead of adding duplicate exports.

## What changed

- Twenty original task guides provide direct answers, official resource tables, practical exercises, source dates and related internal links.
- The GTA hub addresses the 149 supplied variants in one canonical page, with release/platform/price/media/download sections. Unsupported claims remain explicit unknowns; no fan leak is presented as official.
- Exact supported queries show a related guide in search and can open that guide through autocomplete. Query aliases are an internal matching index, not a hidden public keyword block.
- Thirty-seven packaged 1200×630 PNG social cards cover the new guides, existing editorial articles and the default site preview. Open Graph and Twitter metadata include descriptive alternative text. GTA uses its publisher artwork.
- Article, BreadcrumbList, resource ItemList and visible FAQ data are server rendered. FAQ markup does not imply eligibility for a Google FAQ rich result.
- The public source-approved inventory increases from 62 to 82 URLs. With the previously released 100 native templates, the expected live sitemap cohort is 182, subject to the existing live publication checks. No imported discovery listing is bulk-approved for indexing.
- OAI-SearchBot is explicitly allowed to read public pages, with the same private-path exclusions as other crawlers. The existing training-bot policy is unchanged. The existing informational llms.txt is refreshed; it is not claimed to cause ranking or AI citations.

## Validation

`npm run build:pages` and `npm run check` passed. Checks cover all 555 unique audit decisions, every mapped query, guide routing and HTML, unique social images and PNG dimensions, structured-data agreement with visible questions, internal links, sitemap exclusions and the existing production regressions. Local builds remain noindex; the existing production hostname applies approved public metadata.

Rankings, Google indexing and citations by AI products are not guaranteed or measured by these checks. This release does not claim #1 positions, field Core Web Vitals, an exhaustive accessibility audit or live Search Console performance.

## Primary search-engine references

- https://developers.google.com/search/docs/appearance/ai-features
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- https://developers.openai.com/api/docs/bots

Each guide also links the original providers supporting its factual notes. Source review does not assert hands-on testing or an endorsement.
