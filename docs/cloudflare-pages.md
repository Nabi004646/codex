# Connect the frontend to Cloudflare Pages

Frontend source: `Nabi004646/codex`, branch `main`.

In the authenticated Cloudflare dashboard, open Workers & Pages, create a Pages project, and connect this repository. Use framework None, build command `npm run build:pages`, output `dist/pages`, repository root, and Node 24. The repository configuration enables `nodejs_compat` and advanced-mode rendering.

Allow the Cloudflare GitHub app to access only the selected frontend repository. A request for unrelated repositories, wider account administration or billing is not required for this build. If the Git integration is already authorized for this repository, reuse it.

Keep `ATLAS_MODE=staging` for the first hosted review. The generated Pages output contains the compiled `_worker.js`, route controls and public assets; it contains no backend secret or original private project guide. Pages must build from source, rather than serving the repository folder or the entire historical checkpoint ZIP as static content.

After a successful build, verify the assigned hostname, CSS/fonts/favicon, resource search, template filtering and preview navigation, hosted-catalog state, custom 404, noindex/robots/sitemap behavior and uncached admin page. Verify the exact hostname before adding it to the separately deployed admin function's allowed origins. Do not use wildcard origin rules or move backend service credentials into browser configuration.

The build and its isolated compiled-module checks are implemented. Authentication into the owner's Cloudflare account and its actual Git connection must still be completed before claiming a live Pages deployment. A domain cutover, approval to index draft content and an authenticated owner security test are not implied by a successful staging build.

Cloudflare references:

- https://developers.cloudflare.com/pages/functions/advanced-mode/
- https://developers.cloudflare.com/pages/configuration/build-configuration/
