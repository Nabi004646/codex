# FreeResourceAtlas frontend

The complete active React frontend and Cloudflare Pages rendering layer for FreeResourceAtlas. The approved yellow directory design, custom brand, dynamic search, categories, resource details, guides, collections, template previews, task finder and protected admin interface are retained.

## Run

Use Node 24.

```bash
npm ci
npm run dev
```

## Cloudflare Pages

Connect this repository to a Pages project with these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run build:pages` |
| Build output directory | `dist/pages` |
| Root directory | Repository root |
| Node version | `24` (also pinned in `.node-version`) |

The advanced-mode `_worker.js` handles server-rendered routes and APIs; assets use Pages' `ASSETS` binding. `wrangler.jsonc` supplies the output directory, compatibility date, Node compatibility and default staging mode. The build runs actual compiled-module checks before deployment.

```bash
npm run build:pages
npm run check
```

Updates pushed to the connected production branch trigger a Pages build. Deployment history provides the previous frontend build for rollback. Changing the repository alone does not configure an account's Git integration or DNS; those settings must be completed in the authenticated Cloudflare dashboard.

## Backend and publication state

`config/backend.public.json` contains only the selected Free-library API URL and publishable key. Admin authorization stays in the separately deployed Supabase backend. No passwords, private answer verifier, service keys or owner credentials belong in this repository or Pages environment variables.

The Pages deployment remains a **noindex staging review**, now with **92,614 searchable unique-URL listings**. The expanded discovery catalog carries explicit unreviewed/unknown-terms labels; it is separate from database publication. The homepage provides visible task-finder, comparison, toolkit and template-preview shortcuts. See [catalog delivery notes](docs/searchable-catalog.md). The editorial preview catalog is separate from the actual published database catalog. `/api/live/resources` uses the published-only database search. Public `/preview/*` diagnostic pages are retired and return404. Production public pages use the reviewed database inventory when production mode is deliberately enabled; drafts must not become indexed by changing a build setting alone.

Template pages contain original preview images and metadata for 100 drafts. The editable documents and PDFs remain in the saved project checkpoint pending separate content/license review and approved file storage. Hosted draft download links are withheld until that release. Private project specifications, historical backend backups and unrelated website configuration are not frontend dependencies and are excluded from this repository.

Before using admin sign-in on a newly assigned Pages hostname, add that exact verified origin to the backend's allowed origins. Retain the owner/MFA/grant checks; never allow all `*.pages.dev` origins. Real owner authenticator enrollment, private verification setup, authenticated import acceptance and production release remain separate gates.

See [Cloudflare connection notes](docs/cloudflare-pages.md) for the account-level connection and checks.


The catalog source is pinned in `data/discovery-seed.json.gz`. `npm run prepare:catalog` verifies and regenerates versioned static search assets; normal builds run it automatically without contacting resource providers. The90k target is a searchable listing count, separate from current source review and SEO approval. This release includes357 translated interface messages across11 languages, saved language preferences, Arabic RTL, and explicit English content fallback. See [release notes](docs/catalog-language-release.md).
