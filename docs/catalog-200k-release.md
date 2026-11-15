# 200,000 searchable listings

The discovery catalog grows from 122,614 to exactly 200,000 distinct listing
URLs. Existing record IDs and lookup aliases are retained. The 77,386 additions
are whole repository listings, not individual files, model checkpoints within a
repository, generated names or invented products.

| Added resource type | Listings |
| --- | ---: |
| AI model repositories | 49,524 |
| Datasets and benchmarks | 21,000 |
| AI demo repositories | 2,386 |
| MCP projects and integrations | 4,476 |
| Total additions | 77,386 |

These are searchable discoveries, not a claim that 200,000 consumer apps have
been independently tested. Counts describe unique URLs; different repositories
can contain related model families or related projects.

## Sources and selection

Hugging Face records come from its public Hub API. Models and datasets require
explicitly public, enabled, ungated repository metadata, a revision and a
recognized open-license declaration. Models require a recorded task and at least
10 snapshot downloads. Datasets require task or data-modality metadata and at
least 100 snapshot downloads. Demos require at least five recorded likes, a
reported open license and a RUNNING or SLEEPING runtime snapshot. Obvious test
and unsuitable metadata are excluded. Downloads, likes and runtime states are
dated observations, not endorsements or promised availability.

Models are collected from general and license-filtered popularity lists, then
combined, deduplicated and ranked by recorded downloads, likes and URL. Existing
catalog destinations are excluded. The selection includes coding, agent
development, image/video generation, audio, computer vision, robotics and
defensive-security metadata where the recorded tags or identity support it.
Categories inferred from repository metadata are discovery aids, not audited
product descriptions.

MCP projects come from Awesome MCP Servers. Only whole GitHub project links
absent from the existing catalog are added. The collection's MIT notice is
retained at `/catalog-notices/MCP-COLLECTION-LICENSE.txt`; it does not license the
linked projects. Individual MCP project terms, destination availability and
security remain unverified.

Names, original destinations, source references, small factual metadata and
original scope summaries are retained. Model weights, datasets, model cards,
collection descriptions and application code are not redistributed. Each new
entry remains **Check terms**, without an independent source-check badge.
Reported licenses do not establish all underlying rights. Hosted inference,
compute, APIs and third-party integrations may cost money.

## Browsing and storage

The resource-type control now includes **AI model**, **Dataset** and **AI demo**.
The AI category also has **AI Models & Weights**, **Datasets & Benchmarks** and
**AI Demos** subcategories. New labels have translations in all ten non-English
interface languages. Original resource metadata continues to use its explicit
English fallback.

Prepared search snapshots cover the new types and common queries including AI
agents, MCP, coding models, robotics, cybersecurity, AI video, text to speech,
datasets and computer vision. Arbitrary searches continue in the browser worker.
Individual repository destinations are external links; no 200,000-page HTML
generation or automatic sitemap expansion occurs.

The pinned catalog input is split into ordered binary parts under `data/catalog-seed/`, with byte counts and SHA-256 hashes in `data/discovery-seed.parts.json`. Catalog preparation verifies every part and reconstructs `data/discovery-seed.json.gz`. The complete gzip checksum remains in the release ledger. To update the pinned source after a manual import, run `npm run pack:catalog-source`; the exact-target expansion helper does this automatically. Builds generate
versioned JSON assets on Cloudflare Pages. **These additions do not import rows
into Supabase**, whose owner-managed publication and administration remain
separate. `data/catalog-release.json` records the exact additions, category
counts, seed size and checksum. Ordinary builds need no provider API access.

## Validation

Run `npm run build:pages`, `npm run check` and `git diff --check`. The catalog
checks assert exactly 200,000 unique IDs/URLs, preserved lookup aliases, source
metadata, type filters, actual topic matches, snapshot consistency, pagination,
review-label separation and the Cloudflare per-file limit. Compiled Pages checks
exercise the new filters without loading the browser search index into a request.
Staging/indexing settings and existing admin authorization are preserved.
