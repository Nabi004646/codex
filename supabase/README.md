# Existing Free-library operations

Target: `jawldxxtolppeccxcihh` (Free-library), not the separate portfolio project.

This directory contains **additive patches for the existing project**, which
already has the Atlas foundation, protected owner administration, MFA grants,
resource tables and editorial RPCs. It is not an empty-project bootstrap. Do not
run a database reset from this partial migration history.

`20261116060523_operations_readiness.sql` was applied through the signed-in
project SQL editor on 2026-11-16 because the connected management MCP account
did not expose this project. Its installed version is recorded privately in
`atlas_ops.release_state`; SQL and HTTP checks confirmed the deployment.

- The two template buckets start private. No anonymous Storage policies exist.
- Anonymous intake has no table-read privileges, a global bounded queue,
  idempotent receipt tokens and withdrawal from review.
- Owner operations require a valid JWT, AAL2, owner membership, a live provider
  session and the existing short-lived application grant. No polling renews it.
- `atlas-stage-originals` validates the fixed private source archive checksum,
  checks every native file, uploads immutable versioned paths, reads the bytes
  back, and registers draft-only file metadata. It never approves a license or
  publishes a download. Both user/MFA requests and existing service-role
  maintenance requests are authorized explicitly; a publishable key is denied.
- The gateway's legacy-secret-only JWT option is off for this function. Owner
  tokens are validated by the protected database RPC, including modern signing
  keys. This setting is preserved in `config.toml`.
- The source review pack is at
  `fra-template-drafts/review-packs/native-templates-20261113.zip`.
  Its SHA-256 is pinned in the staging function. Secrets are never in source.

Run `npm run check:operations` for isolated real-PostgreSQL permission and
intake checks. The fixture guard reproduces the installed baseline admin
guard; it is not a replacement migration for that existing guard.

`node scripts/prepare-template-staging.mjs` generates an additive metadata import
under ignored `reports/`. The 100 original resource records were imported as
drafts in bounded batches. Their unknown pricing and pending distribution rights
prevent accidental public publication.

Public release, a verified email sender, background search-console OAuth and
scheduled cleanup are separate actions. No credentials, email delivery,
subscription consent or successful background sync are fabricated by setup.
