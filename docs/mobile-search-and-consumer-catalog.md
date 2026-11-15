# Mobile controls and consumer search

Adds 63 provider-linked consumer entries: 24 games, 23 mobile apps, 14 desktop
software entries and two web apps. Twelve destinations were already present as
community discoveries and are promoted instead of duplicated. The resulting
catalog has 200,051 distinct destinations. Existing discovery IDs continue to
resolve through aliases; the pinned 200,000-entry seed is unchanged.

Free Fire and PUBG's base offers are labelled Free, with optional purchases
described. Grand Theft Auto V, Minecraft, Terraria, Stardew Valley and Adobe's
paid desktop editors are labelled Paid. Free plan remains separate from Free
and Open source. Links go to providers or official storefronts; this release
does not redistribute installers, game files, accounts or product licenses.
Prices, editions, supported devices and country availability can change; read
each entry's source and access notes. Four explicitly checked base offers gain
dated source-check records. Other additions retain the current-terms review note.

Search now recognizes product aliases such as freefire, PUG, gta5, cs2 and
vscode. Full product names rank above incidental repository matches. Broad games
searches use actual game records; PC, mobile, Android and price qualifiers use
documented catalog fields. Platform qualifiers are applied to scoped consumer
queries so a topic such as computer vision keeps its research results. A close
misspelling is repaired only when the original query has no eligible results,
and the correction is disclosed. Unknown queries can still return no matches.

Autocomplete immediately offers a compact product/topic shortlist, supplemented
by current catalog result names as arbitrary searches finish in the worker.
It supports arrow keys, Enter, Escape, pointer selection, accessible listbox
state and clear price labels. No third-party autocomplete service receives a
query. Full discovery shards remain outside the initial browser bundle.

Advanced filters use bounded grid columns, one labelled select per field and
separate rows for the review checkbox and explanatory text. Phone layouts use a
single column. The language picker has one border and a keyboard focus outline,
fits the full menu width and truncates long header labels. Narrow header text
and translated drawer counts wrap or resize within their available space.
New interface labels and games/app/software search intents cover the existing
11 interface languages; original product names remain searchable.

Validation: `npm run build:pages`, `npm run check`, `git diff --check`, plus
browser checks of phone/tablet widths, filters, the language menu, autocomplete,
product aliases and price labels. Local dev reuses a prepared catalog when its
inputs are unchanged; production builds continue to regenerate it unconditionally.
