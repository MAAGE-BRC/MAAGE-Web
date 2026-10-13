*MAAGE-Web v1.0.20 — Release Notes*
_Production v1.0.13 → v1.0.20 · 23 commits · Sep 24 – Oct 13, 2026_

Rolls up seven tagged releases (v1.0.14 – v1.0.20), corresponding to [PR #219](https://github.com/MAAGE-BRC/MAAGE-Web/pull/219). Mostly viewer-layout and security fixes for the workspace file viewers, one new Markdown viewer, one new outage-banner feature, and account-registration attribution.

*New*

• *Site-wide outage banner* — a config-driven announcement banner, replacing the need to hand-edit a hardcoded HTML comment per outage (the pattern BV-BRC still uses). Set `outageBanner.enabled` / `outageBanner.message` in `p3-web.conf`; it surfaces through `request.applicationOptions` and renders in `navbar.ejs`, so it appears on the home page, every static page, and the whole Dojo app shell. Does **not** appear on the standalone 404/500/503 error pages, which don't include `navbar.ejs`. Read once at boot — toggling it requires a config edit and restart, same as the existing `maintenanceMode` flag.

• *Markdown viewer for workspace `.md` files* — previously fell through to the plain-text fallback. Renders via `markdown-it` with `html: false` inside a sandboxed iframe (`srcdoc`) with a per-document CSP that blocks all network egress; syntax highlighting runs in the parent via `highlight.js` (loaded with `LazyLoad`, since it ships no AMD wrapper) so the frame only ever receives static markup. Known limitations: no Mermaid/KaTeX, no YAML front-matter stripping, relative images show a placeholder link rather than resolving.

• *Similar Genome Finder added to the genome Services menus* — previously only reachable from elsewhere in the app; the menu entry existed only as a commented-out stub. Shows for a single genome (overview, or one row selected in a genomes/sequences grid); hidden for multi-select, since the service takes one genome id.

*Bug fixes*

• *Genome overview page was missing all five action buttons* (Services, Add To Group, Download, Share, GUIDE) — the entire block had been left wrapped in an HTML comment. All handlers were already present and unchanged; removing the two comment markers was the whole fix.

• *Workspace viewer layout overlap, fixed across five viewers in sequence* (PDF, Markdown, text/CSV, Experiment, ExperimentGroup): a `BorderContainer` sizes its center region from the header's height *at layout time*, but viewer headers are populated asynchronously from workspace calls — so the center kept a stale height and overlapped the header or the rendered content below it. Each viewer now calls `resize()` after its header content is set. Documented as a named pattern in `CLAUDE.md` so it isn't rediscovered a sixth time.
  - The breadcrumb-specific case (long workspace paths wrapping to a second line and overlapping the PDF viewer) had its own root cause: the breadcrumb rewrite never notified the enclosing `BorderContainer`.
  - The Markdown-viewer case additionally had broken markup (`formatFileMetaData` emitting a stray closing `</table>` and un-cleared floats that collapsed the header's real height), which is what let the layout bug go unnoticed in sibling viewers until this release.

• *XSS: file metadata rendered unescaped in two places* — found while fixing the Markdown-viewer overlap above. A workspace filename containing `<img onerror=...>` executed via `formatter.keyValueTable`, which interpolated labels/values into HTML without escaping (reachable from the file viewers and from the organism name in `viewer/Model.js`). Fixed at the source; `keyValueTable` now escapes both labels and values.

*Changes*

• *Workspace file viewer iframe is now sandboxed* (`sandbox="allow-scripts"`, deliberately without `allow-same-origin` — the two together are equivalent to no sandbox at all, since the frame could then strip its own `sandbox` attribute). Verified against a real 230 KB cgMLST report with jQuery/Plotly/DataTables/XLSX: all JS still works, and `parent.App.authorizationToken` is unreachable from the frame (`SecurityError`). Documented as a sanctioned exception to the "never feed markup to a rendering sink" XSS policy in `CLAUDE.md`.

• `formatFileMetaData` (the file-viewer header) deduplicated out of `File.js`/`TSV_CSV.js` into a shared `util/fileHeader.js`, built with `domConstruct` + `textContent` rather than string concatenation — closing the XSS gap above at its root and fixing a drift where `TSV_CSV.js` never received fixes `File.js` had already gotten (unguarded/unquoted download href).

• *Account registration now declares its originating site* (`registration_site_url: window.App.appBaseURL`), so the shared user service (used by BV-BRC, MAAGE, DXKB, LDKB alike) can attribute new accounts per frontend. Also corrects `config.js`'s `appBaseURL` default, which had been BV-BRC's own URL. Requires the matching `p3_user` service-side change to be deployed **first** — if this lands before that, registrations made in the gap are permanently unattributable (no backfill).

*Developer-facing*

• `CLAUDE.md` — new sections on the viewer re-layout pattern, the sandboxed-document-viewer exception, the `/public` workspace path prefix, and a cross-reference to the separate `Workspace` service repo (including why a stall there presents as "MAAGE-Web is slow" — it's a single-threaded download service behind a 25-worker RPC service).

*Known issues and follow-ups*

• *Safari popup blocker breaks MicrobeTrace launch* (pre-existing, not addressed this release) — `window.open` is called after an `await`, so the user-gesture window has expired by the time it runs.

• *Markdown viewer cannot auto-size to its content* — same constraint as the HTML viewer: that needs `contentDocument.scrollHeight`, which needs `allow-same-origin`, which would defeat the sandbox. Content scrolls inside a fixed-height frame instead.

*Rollback*

No database migrations. Config changes are additive and default to current behavior (`outageBanner.enabled: false`, `maintenanceMode` unchanged), so a straight revert to `v1.0.13` is clean — except for the registration-attribution change (PR #211), which should not be rolled back independently of the corresponding `p3_user` deploy; coordinate before reverting past that commit.
