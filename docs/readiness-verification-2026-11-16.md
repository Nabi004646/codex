# Production verification — 2026-11-16

## Verified on the live service

- Owner password sign-in and authenticator verification completed securely.
- The admin reported the correct Free-library project, 100 editable drafts,
  241 private objects (one archive plus 240 native files) and 240 file records.
- A real business template received useful search tags. Save readback confirmed
  revision 2. No fixture or unreviewed native download was published.
- A content snapshot restored 391 rows across nine tables into an isolated
  PostgreSQL database. All 23 exported deployed application function definitions
  matched the recovered version-controlled migrations. Auth credentials,
  sessions, private owner configuration and visitor submissions were excluded.
- The six application migrations rebuild successfully; the original owner,
  verified-factor, provider-session, idle and revision guards were exercised.

## Corrected production failures

The suggestion/withdrawal adapter used a redirect mode Cloudflare Workers does
not support. It now uses manual redirects and rejects upstream redirects before
processing the body. Compiled-Worker checks cover successful POSTs and rejection.

Locking aborted the SDK transport before provider logout. Logout now uses a
separate bounded keepalive request, after in-memory access has been cleared.

Literal SSR substitutions interpreted dollar-sign replacement sequences inside
user queries. Callback substitutions preserve the exact string in runtime,
prerendered and development responses; compiled checks parse the bootstrap JSON.

In-page admin anchors create history events. They previously invoked the leave
handler and destroyed the unlocked workspace. The history check now compares
origin, path and query; same-document section navigation stays unlocked.
Page hiding, document exit, idle expiry and the maximum session still lock.

## Monitoring

The dependency-free production monitor reads the homepage and its current
JavaScript bundle, games search, sitemap, robots, private admin headers and a
missing-page response. It sends no credentials and makes no writes. The GitHub
workflow runs on its initial push, on demand, and every six hours with an empty
token permission set. GitHub records failures; notification delivery depends on
the owner's GitHub notification settings. This does not monitor private logs,
database quota trends or email delivery.

## Remaining release dependencies

Original native files are fully staged, but their distribution terms and
publication are separate. Paid and unknown third-party access is never relabeled
free. Google and Bing ownership/sitemap observations do not grant a background
reporting connection. Persistent read-only Google OAuth and a server-side Bing
key need explicit account authorization. Email needs a verified sender domain,
restricted provider credential, opt-in/confirmation/unsubscribe handling and a
consented delivery test. No delivery or successful API sync is represented yet.

A complete off-site backup must additionally cover private operational rows,
platform Auth recovery, configuration and current Storage bytes. The content
restore and source archive are useful recovery layers, not a substitute for
that full backup. No paid plan upgrade, credential change or production restore
was performed.
