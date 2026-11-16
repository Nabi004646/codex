# Original templates, version 2

The owner approved the 100 original templates and 240 native files for CC BY 4.0 release. Version 1 review material remains private. The version 2 release changes header/footer license notices and document properties, preserving working content and spreadsheet formulas. CSV working data is unchanged.

- 100 one-page PDFs, 60 one-page DOCX documents, 40 XLSX workbooks and 40 CSV files.
- Verified native bytes: 7,520,458.
- Private release archive: `fra-template-drafts/review-packs/native-templates-20261116-v2.zip`.
- Archive SHA-256: `87a5e7140b03d8c4137792c710ca09b609bec68b8b92641ef828dc1a6048f818`.
- `data/template-release-v2.json` pins every native path, byte count and SHA-256; source flags alone never enable public downloads.

`npm run prepare:templates` restores both versions from checked, bounded USTAR source parts without network calls or publication. Authoring scripts in `scripts/templates-v2` require the document/PDF tools and the primary runtime's `@oai/artifact-tool`; ordinary builds use the pinned bytes instead. The packing script is an explicit release-maintenance action, not a build step.

The owner-only release control uses password/MFA, a live provider session and the existing short application grant. Each function request releases at most four templates. The function downloads the pinned archive, verifies each file before upload and again from Storage, then publishes each resource and its file records atomically with a saved-revision guard. Retrying does not republish an owner-withdrawn record. The deployed legacy JWT gateway protection is retained; custom owner authorization also runs inside the function.

Storage buckets stay private. Only licensed file records with a currently published parent pass the Storage RLS policy. `/api/template-download` repeats that publication check and verifies the stored bytes before serving an attachment. It never sends privileged credentials or reusable signed links to the browser. Withdrawing a parent closes subsequent downloads and removes its SEO rows through RLS.

Template pages use current published database content. Native template sitemap entries require approved English SEO rows and the complete pinned published native-file inventory. Other source-approved URLs remain independent. Sitemap eligibility does not establish Google indexing.

Validation includes all 100 PDF text/bounds checks and page renders, all 60 DOCX renders, all 40 workbook release-area renders and independent OOXML checks of original cell values, formulas, merges, validation, view and print features. Isolated SQL and HTTP checks cover unprivileged release denial, license and source-hash mismatches, missing stored bytes, revision conflicts, idempotency, tampered downloads, private source isolation, owner withdrawal and compiled Pages responses.
