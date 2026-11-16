# Operations readiness — 2026-11-16

The former static “Connections still required” banner treated the management
connector's account scope as a website outage. The live owner session exposed
the correct Free-library project. Its services were healthy, but its resource
tables and Storage were genuinely empty.

## Delivered

- Live, owner-authenticated setup cards with explicit refresh, private counts,
  direct actions and exportable observations. No idle keepalive polling.
- Real suggestion/correction delivery into a private database queue, bounded
  write-only intake, retry receipts, withdrawal and owner moderation.
- Two private Storage buckets, immutable versioned uploads and owner/MFA/session
  policies. A private original-source ZIP is uploaded and hash-pinned.
- 100 original template metadata records imported as editable drafts. Rights
  and publication remain unapproved. The protected staging job can verify,
  upload, read back and register the 240 native files in resumable batches.
- The verified Google Search Console domain property was inspected. Google
  processed the submitted sitemap and discovered 61 pages. This is recorded as
  a browser observation, separate from API sync and actual indexing.
- Accurate form/privacy text and smaller initial bundles: template staging
  metadata is requested only when the admin panel needs it.

## Verification

`npm run build:pages`, `npm run check`, real-PostgreSQL permission/receipt/rate
checks and browser form delivery/withdrawal were exercised. The isolated admin
layout and moderation flow were checked at 375- and 1265-pixel viewports with no
horizontal overflow or visible alerts. The temporary fixture was removed.

Live SQL confirmed 100 template drafts, one private source archive, zero pending
submissions, one withdrawn operational check, no anonymous queue reads or admin
RPC access, and both buckets private. The existing admin rejects unsigned access;
the new staging job rejects a publishable key without an owner grant. Security
Advisor reported no errors; its pre-existing leaked-password-protection warning
remains. No password or authentication credential was changed.

## Still requires owner interaction

Running the staging job through the website requires a freshly unlocked owner
session. The job has not been represented as completed before that execution.
Native public distribution requires a separate content/rights decision. Bing
requires sign-in/property authorization. Background search reporting needs its
own OAuth setup; email needs a verified sender and delivery provider. No emails,
subscriber enrollment, scheduled cleanup or invented successful sync was used.
