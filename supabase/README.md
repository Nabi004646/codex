# Existing Free-library operations

Target: `jawldxxtolppeccxcihh` (Free-library), not the separate portfolio project.

The original five application migrations and owner-admin function source have
been recovered and restored to version control, alongside the operations patch.
An isolated PostgreSQL rehearsal rebuilds all six migrations and verifies the
actual deployed function definitions against this source. Platform-owned Auth,
Storage services, owner configuration and secrets still need separate recovery.
Never run a database reset against the hosted project. Its historical SQL was
applied through the dashboard, so CLI migration bookkeeping must be reconciled
before using push/pull commands against that existing database.

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

Run `npm run check:recovery` for a complete application-schema rebuild, the
original owner/MFA guards and a local content restore. Passing a content snapshot
as `node scripts/check-recovery.mjs /absolute/path/backup.json` also restores its
rows into an isolated database and compares deployed function definitions. It
does not execute SQL supplied by the snapshot or connect to a hosted database.

Run `npm run check:operations` for isolated real-PostgreSQL permission and
intake checks. The fixture guard reproduces the installed baseline admin
guard; it is not a replacement migration for that existing guard.

`node scripts/prepare-template-staging.mjs` generates an additive metadata import
under ignored `reports/`. The 100 original resource records were imported as
drafts in bounded batches. Their unknown pricing and pending distribution rights
prevent accidental public publication.

The live owner session completed all 240 native uploads and checksum readbacks.
The original pack remains private. A separate content snapshot was exported and
restored successfully: 391 rows in nine tables, including 100 template drafts
and 240 file records. This is a content backup, not an Auth or complete project
backup. Free-plan projects do not have managed daily backups; an unattended
off-site full backup still requires a securely configured destination and
database access. Storage object bytes must be backed up separately.

Public release, a verified email sender, background search-console OAuth and
scheduled cleanup are separate actions. No credentials, email delivery,
subscription consent or successful background sync are fabricated by setup.
