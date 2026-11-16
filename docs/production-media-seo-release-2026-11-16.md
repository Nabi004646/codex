# Production media, navigation and crawl release

The reported Explore dropdown stayed open because native details elements do not dismiss on outside interaction. It now closes on outside pointer input, focus leaving, Escape, or a selected link. Escape returns focus to its summary. The scrollable panel fits short viewports.

The missing blog pictures were a packaging defect: `article-covers` existed in the build but was omitted from the standalone Pages artifact. A shared static-directory inventory now drives copying, Worker asset routing and `_routes.json`. Checks compare all 16 delivered article covers and pinned publisher thumbnails with their source bytes. An image failure has a useful text fallback rather than a broken image icon.

Matching publisher previews have responsive 480/800 WebP variants, content-hash filenames, source evidence and byte/hash checks in `data/publisher-previews.json`. They are cached as immutable assets. Resizing, compression and the documented Flat UI crop preserve the publisher’s actual pixels; no generated application imagery is substituted. The Brumm address was observed serving a parked domain on 15 November; its preview is suppressed with an explicit source-status note.

Remaining eligible remote media can use a same-origin cache restricted to approved public publisher/CDN hosts. Fetches have a 3.5-second deadline, 2.5 MB body limit, MIME/signature checks, bounded revalidated redirects and no forwarded visitor cookies or credentials. Successes and failures have bounded cache lifetimes. A publisher icon can provide a labeled fallback for an ordinary provider website; shared platforms such as Drive or app stores do not receive an unrelated generic platform icon. Missing or unavailable media remains visibly unknown. This does not establish reuse permission, current product terms, safety or availability for every imported resource.

The blanket static `X-Robots-Tag: noindex` header was removed from public images. Private pages and preview hosts retain their own noindex rules. Original blog illustrations, publisher thumbnails, fonts and existing screenshots receive appropriate public caching. Anonymous HTML cache keys include the frontend revision and trusted country hint, so a new release does not reuse HTML pointing at old asset filenames. Cookie-bearing and private HTML remain uncached publicly.

## Indexing and answer content

The source-controlled canonical English cohort expands from 17 to 61 URLs. It includes 16 original practical guides checked against primary documentation on 15 November, the blog and getting-started indexes, seven starter kits and their index, twelve working browser templates, four useful browser tools, collections and the documented basic-laptop page. The SEO guide’s staging-specific paragraph was corrected before publication. Proposed exercises remain explicitly unbenchmarked; source checks do not claim hands-on product tests.

Unreviewed discovery resource pages, the hundred unpublished native templates, empty downloads, private toolkit/compare state, arbitrary searches and unreviewed language variants are excluded. The planner uses the workflow canonical; the duplicate getting-started alias redirects to `/guides`. Known trailing-slash variants redirect once. Missing sitemap batches return 404. Search URLs can be crawled to read their noindex instruction.

Per-page titles, descriptions and canonicals are distinct where appropriate. Published guides expose real publication/modification dates and primary citations. Standard JSON-LD describes the site, publisher, breadcrumbs, articles, browser tools and only the questions/answers actually visible on a page. Client search navigation updates metadata rather than retaining an indexable homepage tag after changing the URL. This is ordinary technical SEO and useful answer content; no special AI markup, guaranteed rank, citation rate or rich-result eligibility is claimed.

Sitemap membership is an eligibility inventory, not a Google index report. Search Console authorization is still needed for actual indexing observations and provider reports. The existing management-access, native-file distribution and full specification blockers remain unchanged.

## Acceptance

`npm run build:pages` packages the standalone Worker and static assets. `npm run check` includes media integrity/cache/security tests, all 61 source-approved SSR pages, canonical routing, sitemap exclusions and asset-revision isolation in addition to existing search, language, admin-boundary and template checks. Browser acceptance covers outside/focus/Escape dismissal, the reported UI images and blog covers, responsive layouts and the final deployed hostname. Internal checks are not a field Core Web Vitals measurement or an exhaustive accessibility audit.
