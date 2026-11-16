# Remaining account and distribution approvals

These are proposals for the next setup actions, not claims of connected services.
The public site, owner authentication, private form queue, native file staging,
content recovery rehearsal and scheduled public health checks are already live.

## Reporting access

Use an owner-controlled Google OAuth web client for the verified
`sc-domain:freeresourceatlas.com` property. Request only
`https://www.googleapis.com/auth/webmasters.readonly`, with offline access for
daily reporting. Store client credentials and refresh tokens only in the
Free-library server secret store. Consent and account selection happen through
the provider, without passwords, codes or token values in chat.

For Bing, prefer read-only Webmaster OAuth where available. If the owner elects
the account API-key route, that key covers all sites in the Bing account and is
not a property-scoped read-only credential; application code must restrict use
to the FreeResourceAtlas property and reporting methods. Do not create or copy
that broader credential under a generic setup approval.

Ownership verification and sitemap submission have already been checked in
the provider dashboards. Those observations do not supply website API access.

## Email sender

Proposed provider: Resend, using an owned sender subdomain such as
`updates.freeresourceatlas.com`. Verify its provider-issued DNS records and
create a sending-only domain-restricted key for the Free-library server.
Keep delivery disabled until sender verification and explicit double opt-in,
confirmation and unsubscribe behavior are implemented and checked. A real
delivery check needs one owner-specified recipient and purpose. Do not send to
existing contacts or enroll addresses merely because they exist in an account.

No paid plan, new billing agreement or automatic mailing-list import is part
of this proposal. Stop for any provider terms or paid requirement.

## Full unattended backup

The current content snapshot is recoverable and excludes authentication and
private operational records. A complete unattended backup needs a restricted
database backup identity, encryption and an owner-approved private off-site
destination. Private moderation and Auth recovery material require explicit
scope and destination approval; they must never enter this public repository.
Keep live sessions and credentials out of ordinary content recovery. Rehearse
restoration into an isolated target, never over the production database.

## Original template distribution

The fixed original pack contains 100 templates and 240 native files. All files
are privately staged with size, SHA-256 and stored-byte readback verification.
Proposed reuse terms are CC BY 4.0 for the original template material: free
download, editing, sharing and commercial use with attribution. This is not a
license for third-party applications, game assets or unrelated publisher media.
The license freedoms cannot be revoked for recipients who follow its terms.
The owner must approve the content and distribution rights before this release
is activated. Keep native downloads private while that decision is pending.

## References

- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://learn.microsoft.com/en-us/bingwebmaster/oauth2
- https://learn.microsoft.com/en-us/bingwebmaster/getting-access
- https://resend.com/docs/add-a-domain
- https://resend.com/docs/create-an-api-key
- https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails
- https://supabase.com/docs/guides/platform/backups
- https://creativecommons.org/licenses/by/4.0/
