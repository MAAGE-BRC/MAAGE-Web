# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MAAGE-Web (Midwest Alliance for Applied Genomic Epidemiology) is a genomic surveillance platform web application built on the PATRIC/BV-BRC codebase. It's an Express.js server-rendered application using EJS templates with a Dojo-based frontend.

## Requirements

- Node.js v18.x or newer
- NPM v9.x or newer

## Common Commands

```bash
# Install dependencies
npm install

# Initialize git submodules (required for frontend JS libraries)
git submodule update --init

# Start development server (runs on http://localhost:3000)
npm start

# Build Tailwind CSS
npm run tw:build

# Build minified Tailwind CSS
npm run tw:build:min

# Watch Tailwind CSS for changes during development
npm run tw:watch

# Build the Dojo client bundle (needs Java for the Closure compiler)
./buildClient.sh

# Same build, but failing on a regression -- what CI runs. Use this, not
# buildClient.sh directly: see "The client build" below.
./scripts/check-build.sh

# Verify the vendor symlinks under public/js
npm run check:links

# Recreate them from public/js/links.json (also runs on npm install)
npm run link:vendor
```

## Architecture

### Server-Side (Express.js)

- **Entry point**: `bin/p3-web` - starts the HTTP/HTTPS server
- **Main app**: `app.js` - Express application setup, middleware, and route mounting
- **Configuration**: `config.js` loads settings from `p3-web.conf` (copy from `p3-web.sample.conf`)
- **Routes**: `routes/` - Express routers for different endpoints (viewers, search, workspace, apps, etc.)
- **Views**: `views/` - EJS templates; uses partials like `navbar.ejs`, `footer.ejs`, `head.ejs`

### Client-Side (Dojo Framework)

- **Core application**: `public/js/p3/app/p3app.js` - main Dojo application
- **Widgets**: `public/js/p3/widget/` - Dojo widgets (~280+ widgets for different features)
- **Data stores**: `public/js/p3/store/` - data stores for API interaction
- **Resources**: `public/js/p3/resources/` - shared resources
- **Router**: `public/js/p3/router.js` - client-side routing

### Frontend Dependencies — three routes, deliberately

A frontend library reaches the browser by one of three paths. Knowing which
one you are in explains most build surprises.

| route | count | examples | bundled by `buildClient.sh`? |
|---|---|---|---|
| git submodule under `public/js/` | 21 | dojo, dijit, dojox, dgrid, d3, JBrowse | yes |
| npm package **symlinked** into `public/js/` | 15 | cytoscape ×6, jquery, dagre, webcola, phyloxml, jbrowse | yes |
| vendored file under `public/maage/` | — | echarts, chart.js, d3v7, gridstack, markdown-it, highlight.js | **no** — fetched at runtime |

**The npm route is symlinks, not a bundler step.** `public/js/cytoscape` is a
committed symlink (git mode `120000`) to `../../node_modules/cytoscape`,
registered as an AMD package in `public/js/release.profile.js`. The browser
never sees `node_modules`; `app.js` does not serve it.

That set is declared in **`public/js/links.json`** and managed by two scripts:

- `scripts/link-vendor.js` (`npm run link:vendor`) creates, repairs and prunes
  links. Runs from `postinstall`.
- `scripts/check-vendor-links.js` (`npm run check:links`) verifies and exits
  non-zero. Runs in CI.

Adding a library to `links.json` without adding it to `package.json` produces
a link no `npm install` can ever satisfy — and **`npm ls <pkg>` reports
`(empty)` rather than an error** for that case, which is how a dangling
`clipboard-js` link survived unnoticed. The checker exists because npm's own
tooling does not see this.

**Choosing a route.** npm + symlink when the library is a well-behaved AMD
module belonging in the core bundle; `public/maage/` when it is loaded lazily
or cannot use the AMD path at all. highlight.js is a real instance of the
latter — it ships no AMD wrapper, only a `var hljs` global, and a package name
containing a dot breaks Dojo's resolver, so `require()` returns `undefined`.
It is loaded via `LazyLoad` instead.

**Do not assume a same-named npm package is the same project.** Checking the
submodules against npm, 6 of 10 resolve to a *different* repository —
`lazyload` on npm is an image lazyloader by tuupola, while this repo uses
rbuels' script loader of that name. Substituting on a name match would be a
supply-chain swap, not a migration.

### The client build

`./buildClient.sh` runs Dojo's build with the Closure compiler (needs Java).

**It exits 0 even when the build reports errors.** Use
`./scripts/check-build.sh` instead — it ratchets against a recorded
`BASELINE_ERRORS` and fails only if the count rises, so a real regression
blocks while pre-existing noise does not. Lower the baseline when the count
drops; the script says so when it notices.

The baseline is not zero because ~19 `error(311) missing dependency` reports
are structural:

- libraries under `public/maage/` are fetched at runtime and deliberately
  absent from `release.profile.js`, so the builder cannot see them;
- `heatmap/dist/*` is tagged `copyOnly` in `heatmap/app.profile.js`, so it is
  copied verbatim rather than registered as an AMD module (the file does ship);
- molstar and mauve_viewer are absent from this checkout.

**These cannot be suppressed in place.** Severity in the Dojo builder is a
pure function of the message id — `util/build/messages.js` maps 300–399 to
`error` and hardcodes `amdMissingDependency` as `311` — and
`util/build/transforms/depsScan.js` logs it unconditionally. No pragma, no
allowlist, no profile override. Hence the ratchet.

A *fixable* 311 usually means a real module that simply has no package entry
in `release.profile.js` (this was true of `dagre`), or a `dojo/text!` with a
leading-slash absolute path — that form resolves only against the running
server, never the filesystem. Use the relative form.

### CI

`.github/workflows/verify.yml` runs on PRs to `dev` and `main`: a fast vendor-
link job, then `npm ci` → `check:links` → `check-build.sh` with Java. The other
four workflows only bump versions and tag — before this, **nothing was ever
built in CI**, so build breakage reached developers and production directly.

### Pending: the Dojo upgrade

`dojo`, `dijit`, `dojox` and `util` are pinned at the clean upstream tag
**1.16.3**; 1.17.3 is current. The upgrade is wanted — 1.17.0 carries
**CVE-2021-23450** (prototype pollution in `_base/lang.js`) and
GHSA-jxfh-8wgv-vfr2 — but is deliberately **not** bundled with the build-
infrastructure work, so that a build failure has exactly one suspect.

Two properties make it separable, both verified:

- npm publishes **1.16.3 itself**, and the `dojo@1.16.3` tarball is
  byte-identical to the submodule checkout. So submodule→npm can be landed as
  a provable no-op, before any version change. Note `util` maps to
  **`dojo-util`** on npm, not `util` (which is Node's shim).
- The real risk in the bump is not the library. `util` carries a replaced
  Closure jar (10.8 MB → 13.5 MB), and `dojo/store/Memory` changed `put` to
  append rather than prepend — a change that passes CI and silently reorders
  grids. `check-build.sh` catches the former; only hand testing catches the
  latter.

Pin exactly: 2.0 alphas are published to the registry (a `beta` dist-tag
points at `2.0.0-alpha.7`), so a caret range would pull in a rewritten
framework.

**`dgrid` is not a migration candidate** despite being same-repo: npm has
1.3.3, the tree is on 0.3.17-dev. That is a 0.3→1.x API port across ~280
widgets, a project in its own right.

### MAAGE-Specific Assets

- `public/maage/` - MAAGE-specific CSS, fonts, images, and maps
- `public/maage/css/src/tailwind.css` - Tailwind source file with MAAGE component styles
- `tailwind.config.js` - Custom MAAGE color palette and typography configuration

### Styling

The project uses a hybrid approach:
- Dojo/Dijit built-in styles for legacy components
- Tailwind CSS for modern MAAGE-specific components
- Custom MAAGE color palette defined in `tailwind.config.js` with primary, secondary, tertiary, quaternary, and quinary color scales

## Configuration

Copy `p3-web.sample.conf` to `p3-web.conf` and configure:
- `http_port` - Server port (default: 3000)
- `dataServiceURL` - Backend API endpoint
- `appBaseURL`, `accountURL`, `userServiceURL` - Various service URLs
- `production` - Set to true for production mode
- `enableDevTools` - Enable development tools
- `maintenanceMode` - Enable 503 maintenance page

## Key Patterns

- Routes render EJS templates with `req.applicationModule = "p3/app/p3app"` to load the Dojo app
- Application options are passed to the client via `req.applicationOptions` middleware in `app.js`
- Proxying is configured for external services via `proxyConfig` in config
- Static assets are versioned using `packageJSON.version` for cache busting

## Security: XSS Prevention

This codebase has been audited for XSS vulnerabilities. Follow these patterns to prevent reintroducing them.

### 1. Never Use `innerHTML` with User-Controlled Data

**Bad:**
```javascript
this.queryNode.innerHTML = '<span>' + userInput + '</span>';
```

**Good - Use `textContent` for plain text:**
```javascript
this.totalCountNode.textContent = ' ( ' + count + ' Genomes ) ';
```

**Good - Use `domConstruct` for structured content:**
```javascript
var container = domConstruct.create('div');
domConstruct.create('span', { textContent: userInput }, container);
domConstruct.place(container, this.queryNode);
```

### 2. Escape HTML When Building Strings

Use the `escapeHtml()` function in `public/js/p3/util/QueryToEnglish.js`:

```javascript
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

Apply to any user-controlled value before inserting into HTML strings.

### 3. Encode URL Paths

Use `encodePath()` when constructing navigation URLs with user-controlled paths:

```javascript
function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

// Usage
Topic.publish('/navigate', { href: '/workspace' + encodePath(userPath) });
```

### 4. Common Vulnerable Patterns to Avoid

| Vulnerable Pattern | Safe Alternative |
|-------------------|------------------|
| `node.innerHTML = value` | `node.textContent = value` |
| `'<a href="' + url + '">'` | `domConstruct.create('a', {href: url})` |
| `/workspace` + path | `/workspace` + encodePath(path) |
| `decodeURIComponent()` on paths | Keep paths encoded |

### 5. Sanctioned exception: sandboxed rendering of untrusted documents

Some viewers must render whole documents that users supply — HTML job reports and
Markdown files. These cannot use `textContent`/`domConstruct`, because the
point is to render markup. They are allowed to feed markup to an iframe, but
**only** under a sandbox, and the sandbox is the security boundary rather than
any filtering we do.

Why this needs stating: the viewer content arrives from a **same-origin** URL
(`workspaceDownloadAPI` is a relative path), `window.App.authorizationToken` is a
live OAuth credential readable from page JS, and `app.js` sets
`contentSecurityPolicy: false` — so there is no app-wide backstop. An unsandboxed
frame means any script in a shared workspace file can steal the viewer's session.

**Never add `allow-same-origin` alongside `allow-scripts`.** The two together are
equivalent to no sandbox at all — verified in a browser: a frame with both reads
`parent.App.authorizationToken` *and* can remove its own `sandbox` attribute.

| Viewer | Content | Sandbox | Why |
|---|---|---|---|
| `viewer/File.js` | HTML job reports | `allow-scripts` | Reports need JS — cgMLST_Report.html is 230 KB with jQuery, Plotly, DataTables, XLSX |
| `viewer/Markdown.js` | `.md` files | *(neither flag)* | Markdown needs no script; uses the strictest setting |

`Markdown.js` additionally sets a per-document CSP inside its `srcdoc`
(`default-src 'none'; img-src data:`), which blocks all network egress from the
frame — no beacons, no tracking pixels. It renders with `markdown-it` configured
**`html: false`**, so raw HTML in a document is escaped to text rather than
parsed. That third invariant is as load-bearing as the two sandbox flags.

Consequences to expect, not to "fix":

- `iframe.contentWindow.document` is unreadable. To retarget links, use
  `allow-top-navigation-by-user-activation`, never `allow-same-origin`.
- Auto-sizing a frame to its content is impossible for the same reason.
- `allow-downloads` is safe to add if an export breaks, but add it on evidence.
  Verified that `XLSX.writeFile` works without it.

### 6. Files with Security-Critical Code

- `public/js/p3/util/QueryToEnglish.js` - Query display with escapeHtml()
- `public/js/p3/widget/WorkspaceBrowser.js` - Workspace navigation URLs
- `public/js/p3/WorkspaceManager.js` - Workspace API calls
- `public/js/p3/widget/viewer/File.js` - Sandboxed iframe for untrusted documents
- `public/js/p3/widget/viewer/Markdown.js` - Sandboxed iframe + markdown-it html:false
- `public/js/p3/widget/viewer/*.js` - Viewer widgets with DOM manipulation
- `lib/securityUtils.js` - Server-side sanitization utilities

### 7. Server-Side Security Utilities

The `lib/securityUtils.js` module provides:
- `sanitizeEmailHeader(str)` - Prevents email header injection (CRLF attacks)
- `sanitizeEmail(email)` - Validates and sanitizes email addresses
- `sanitizeUrlPath(path)` - Sanitizes URL paths
- `isValidHttpUrl(string)` - Validates HTTP/HTTPS URLs
- `sanitizeText(str, maxLength)` - General text sanitization
- `validateIntegerInRange(value, min, max)` - Numeric validation
- `validateAllowedValue(value, allowedValues)` - Whitelist validation

## MicrobeTrace Integration

### Overview

MicrobeTrace (CDC molecular epidemiology tool) is integrated via partner handoff. Fork at `BV-BRC-dependencies/MicrobeTrace` (dev branch), included as git submodule `microbetrace-src/`.

### Build & Deploy

```bash
# After checkout or submodule update:
git submodule update --init
cd microbetrace-src && git checkout -- package-lock.json src/environments/version.prod.ts && cd ..
npm run build:microbetrace
```

Requires Node.js >=22.12.0. Build output goes to `public/microbetrace/` (gitignored).

### Key Files

| File | Purpose |
|------|---------|
| `public/js/p3/util/microbeTraceHandoff.js` | Shared partner handoff utility (postMessage flow) |
| `public/js/p3/widget/viewer/MicrobeTrace.js` | Workspace browser viewer widget |
| `public/js/p3/widget/viewer/CoreGenomeMLSTResult.js` | cgMLST job result viewer |
| `public/js/p3/widget/viewer/WholeGenomeSNPResult.js` | wgSNP job result viewer (recursive folder listing) |
| `public/maage/config/microbetrace-default-style.json` | Default display style (colors, labels, threshold, default view) |
| `public/maage/img/microbetrace-icon.svg` | White icon for workspace sidebar |
| `public/maage/img/microbetrace-icon-dark.svg` | Dark icon for job result header |
| `routes/microbetrace.js` | Express route serving MicrobeTrace static assets |

### Style Configuration

All MicrobeTrace display settings are in `public/maage/config/microbetrace-default-style.json`. Key widget settings:

- `default-view` — startup view (e.g., "Phylogenetic Tree")
- `node-label-variable` — 2D network node labels
- `physics-tree-node-label-variable` — tree leaf labels
- `link-threshold` — link visibility threshold
- `default-distance-metric` — "snps" or "tn93"
- `node-color-variable` — color-by field (e.g., "cluster")

#### Metadata column names are PascalCase

Any style setting that names a **metadata** column must use the PascalCase form.
Both result-generating modules pascal-case every column when writing
`metadata.tsv` (`bvbrc_CoreGenomeMLST/service-scripts/core-genome-mlst-utils.py`
and `bvbrc_WholeGenomeSNPAnalysis/service-scripts/whole_genome_snp_utils.py`,
identical `to_pascal_case` implementations):

| API field | metadata.tsv column |
|---|---|
| `genome_id` | `GenomeId` |
| `genome_name` | `GenomeName` |
| `isolation_source` | `IsolationSource` |
| `state_province` | `StateProvince` |

Use `GenomeName` for labels (readable organism names); `GenomeId` is the numeric
id (e.g. `28901.36220`). Not every value in the style is a metadata column —
`_id`, `id`, and `cluster` are MicrobeTrace built-ins and must stay lowercase.

**A style naming a nonexistent column fails silently.** The tree builds its
label dropdown from the columns actually present in the loaded data, so a
missing field leaves the select holding a dangling value and renders no labels
at all — no error, no fallback. If labels are blank but appear as soon as you
pick a field in the settings panel, the style is naming a column that no longer
exists.

Caveat: wgSNP drops any column present in under 70% of rows (`genome_id` is
always kept), so a sparse dataset can produce the same blank-label symptom even
with a correct style.

#### Updating the style file

Export it from MicrobeTrace rather than hand-editing: configure the display in
the running app, then File → Save with file type `style`, and copy the result
over `public/maage/config/microbetrace-default-style.json` (the path is
hardcoded in `WorkspaceBrowser.js`). The file is a verbatim dump of
MicrobeTrace's `session.style`.

No rebuild is needed — it is a static asset fetched at runtime, not bundled.

Review the diff before committing: the export captures the entire session,
including dataset-specific color/symbol tables and field selections from
whatever data was loaded. Check the key settings listed above rather than
trusting the export wholesale.

### Job Result Viewers

- **cgMLST**: Locates `.tre` tree, `cgMLST_distance.report`, `metadata.tsv`
- **wgSNP**: Dropdown for All/Majority/Core SNP sets. Each loads ML tree (matched by `.ml.tre` suffix + folder name), distance report, and metadata.tsv. Distance reports specify `field1: genome_id_1, field2: genome_id_2, field3: distance`

### Important Technical Constraints

- **Style timing**: Style applied via 5-second deferred `setTimeout` after `launchClick` to avoid being overwritten by `applyPatristicDistanceDefaults`
- **Default view DOM override**: Must set `$('#default-view').val()` directly before `launchClick` — widget value alone is ignored
- **No multi-view dashboard**: `pendingDashboardRestore` causes infinite loop in Golden Layout — cannot set up multiple views at startup
- **PapaParse dynamicTyping**: Set to `false` in fork to preserve genome ID precision (e.g., `28901.36220`)

### Fork Changes (BV-BRC-dependencies/MicrobeTrace)

- `dynamicTyping: false` in CSV parsing (files-plugin.component.ts)
- `.tre`/`.tree` extension recognition as Newick
- `applyStyleFileSettings` handles link-threshold, distance-metric
- `styleFileApplied$` subscriber calls full `applyStyleFileSettings`
- Tree component reads leaf label from style widgets at initialization
- Handoff metadata supports `style` and `defaultView`
- Receiver status message: "Transferring data to MicrobeTrace"

## Disease Outbreak Alerts

The genome landing page (`/view/Genome/<id>`) shows a "Disease Outbreak Alerts"
card that surfaces recent outbreak news for the genome's species.

### Key Files

| File | Purpose |
|------|---------|
| `routes/outbreaks.js` | `GET /outbreaks/alerts` — fetches, filters, and merges alerts from all sources |
| `public/js/p3/widget/GenomeOverview.js` | `createOutbreakAlertAssessment` and the card render/reset/loading methods |
| `public/js/p3/widget/templates/GenomeOverview.html` | Card markup (`outbreakAlert*` attach points) |
| `public/js/p3/resources/end.css` | Card styling (`.assessment*` classes, spinner keyframes) |

### Data Sources

Three sources, fetched in parallel via `Promise.allSettled` (each failure is
isolated so one down source doesn't blank the card):

- **WHO** — the Disease Outbreak News (DON) API
  (`https://www.who.int/api/news/diseaseoutbreaknews`, OData JSON). Returns
  dated, structured outbreak reports; article links built from `UrlName`. Do
  NOT use the general news RSS (`news-english.xml`) — it's press releases, not
  outbreaks, so species filtering almost never matches.
- **ProMED** — a `site:promedmail.org` Google News RSS query. The term must
  actually match (drops stale generic landing pages). ProMED has no working
  public feed and is often unreachable from the host.
- **Google News** — a plain Google News RSS search for the query terms.

**HealthMap was removed.** Its only reachable feed (`getAlerts.php`) exposes no
real per-article URLs (links are `javascript:` handlers), so it could never
link to actual articles. Don't re-add it without a source that provides real
article URLs (the authenticated `HMapi.php` would work if a key is obtained).

### Behavior Notes

- **Year filter**: only alerts from the current year and the prior year are
  shown. Enforced in `mergeAlertsByUniq` via `ALERT_MIN_YEAR` (computed once at
  module load); items without a parseable date are dropped.
- **Query terms**: the widget searches the species plus an optional alternate
  name (first two words of `genome_name`). Source link buttons must reproduce
  this SAME combined query — Google News uses an `"a" OR "b"` query, WHO uses
  its Google Custom Search Engine URL (`?q=` + `#gsc.q=`) — or the links
  under-return compared to what the card shows.
- **Card UI**: collapsible per-source `<details>` sections (count in the
  header, dated article links on expand); a CSS spinner shows while fetching
  with the summary hidden until results arrive.
- **XSS**: all card content is rendered with `domConstruct` + `textContent`;
  links are only rendered as `<a>` when the URL passes an `^https?://` check.

## Workspace Object Selector

`public/js/p3/widget/WorkspaceObjectSelector.js` — the "Choose or Upload a Workspace Object" dialog used by apps and viewers.

### Path prefix and UI behavior

The `path` property controls which workspace is shown. The leading path segment determines what UI controls are displayed:

- **`/public/...`** — hides the Upload, Create Folder, and Create Workspace buttons. Use this for read-only reference workspaces (e.g. the MAAGE Workshop shortcut).
- **`/<user@domain>/...`** (depth ≥ 3) — shows Upload and Create Folder. Use for user-writable locations.
- **`/<user@domain>`** (depth < 3) — shows Create Workspace only.

### MAAGE Workshop shortcut

The dropdown shortcut "MAAGE Workshop" targets `/public/maage@bvbrc/MAAGE Workshop`. The `/public` prefix is required — without it the selector shows Upload/Create Folder buttons even though the workspace service will reject writes from non-owners.

## The `/public` path prefix

`/public` is a **UI-only display marker** meaning "browsing in public-workspaces
mode." It is **not part of any real workspace path** — the Workspace service
rejects it with `User lacks permission to /`. The object the UI shows at
`/public/maage@bvbrc/X` actually lives at `/maage@bvbrc/X`.

The prefix is **stripped on the way out** to the API and **re-added on the way
back** to grid rows:

| direction | site |
|---|---|
| strip (load-bearing, before the API call) | `WorkspaceBrowser.js` — `'/' + path.split('/').slice(2).join('/')` |
| strip (Homology href) | `WorkspaceBrowser.js` — `.replace(/^\/public/, '')` |
| strip (breadcrumbs) | `ContainerActionBar.js` — `parts[1] == 'public'` |
| **re-add** | `WorkspaceGrid.js` (two sites) — `'/public' + row.data.path` when in public mode |

"Am I in public mode?" is re-derived independently in a dozen widgets as
`path.split('/')[1] == 'public'`; there is no shared helper.

**When debugging a workspace path, do not hand-construct the `/public` form.**
Take `metadata.path` from the service response — it is always the real,
unprefixed path. Viewers such as `viewer/File.js` build their `filepath` that
way, which is why they work despite the URL carrying the prefix.

## Viewer layout: call `resize()` after setting header content

Viewers built on `BorderContainer` size the center region from the header's
height **at layout time**. If a top-region `ContentPane` gets its content after
that — which is the norm, since headers are populated from async workspace
calls — the center keeps the height it was given and the two overlap.

```js
this.viewSubHeader.set('content', this.formatFileMetaData(false));
this.resize();   // re-measure, or the center region overlaps the header
```

This shipped as a visible bug three times before it was understood as one
pattern (`viewer/File.js`, `viewer/Markdown.js`, `viewer/TSV_CSV.js`,
`viewer/Experiment.js`, `viewer/ExperimentGroup.js`). A sweep of the widget
tree found no remaining cases: the `messagePanel` panes in `GridContainer.js`,
`PathwaysContainer.js` and `ProteinFamiliesContainer.js` set content *before*
`addChild`, so the pane is measured with its real content already present.

Two things that make it easy to miss:

- **It can present as wasted space rather than overlap.** If the header
  *shrinks* — `ExperimentGroup.js` swaps two placeholder lines for one — the
  center region is simply pushed too low. Same bug, no visual collision.
- **A floated header can hide it.** The old `formatFileMetaData` floated its
  heading with `pull-left` and never cleared, collapsing the header to
  near-zero height; the missing re-layout only became visible once the floats
  were removed.

Related: an iframe in the center region **cannot** size itself to its content,
because that needs `contentDocument.scrollHeight` and therefore
`allow-same-origin`, which would defeat the viewer sandbox (§5). Such viewers
depend entirely on the container's layout, which is why the `resize()` matters
more there.

## Workspace file viewer (`viewer/File.js`)

The fallback viewer for any workspace file type without a dedicated viewer.
Worth knowing before changing it:

- It does **not** read file bytes. It POSTs to
  `workspaceDownloadAPI + "/set-cookie-auth"` to set a cookie, then points an
  iframe at `workspaceDownloadAPI + "/view" + filepath`. That auth call is a
  network round-trip, so anything gated behind it (a spinner, for instance)
  will not appear until it returns — noticeable on slow networks.
- The download link in the header needs `this.url`, populated from
  `WS.getDownloadUrls()`. The green action-bar DWNLD button is a *separate*
  path that resolves its URL at click time via `WorkspaceManager.downloadFile()`.
  Fixing one does not fix the other.
- On a file viewer page the action bar's `selection` is **empty** — there is no
  grid row to select. Actions that assume a selection must fall back to
  `actionPanel.currentContainerWidget.filepath`.
- For PDFs, `iframe.onload` fires when the browser hands off to its PDF plugin,
  **not** when rendering completes. There is no rendering-complete signal: the
  plugin renders out-of-process and the frame's DOM stays empty.
- The header comes from `util/fileHeader.js`, shared with `viewer/TSV_CSV.js`
  and `viewer/Markdown.js`. It returns a **DOM node**, not an HTML string —
  `ContentPane.set('content', node)` accepts either, and the node form is what
  keeps a filename containing markup from being parsed. It replaced a
  `formatFileMetaData` that had been copy-pasted into two viewers and then
  drifted between them.
- `formatter.keyValueTable` escapes its labels and values. Do not "optimise"
  that away: it renders workspace filenames and owner ids, and the caller feeds
  its output to `innerHTML`.

## Deprecated Genome Filtering

Deprecated genomes are hidden from standard displays, mirroring BV-BRC. The
filter is permanent and deliberately **not** user-removable, so it is injected
into `state.search` rather than `defaultFilter` / `state.hashParams.filter`
(those surface in the filter panel and can be cleared by the user).

| File | Filter |
|---|---|
| `widget/GenomeGridContainer.js` | `onSetState` prepends `ne(genome_status,Deprecated)` |
| `widget/viewer/Taxonomy.js` | `onSetState` injects it alongside the taxon term |
| `store/GenomeDistanceResultMemoryStore.js` | Solr `fq: 'NOT genome_status:Deprecated'` |

Note the last one uses **Solr** syntax, not RQL — that store posts with
content-type `application/solrquery+x-www-form-urlencoded`.

### Filtering a results list against a separate service

Similar Genome Finder does two round-trips: the Mash distance service returns
`[genome_id, distance, pvalue, counts]`, then a second query fetches metadata
for those ids. The deprecated filter applies only to the **second** query, so it
can return fewer genomes than the first reported.

Rows must be dropped when the metadata lookup has no entry for an id. Merging
with `lang.mixin({}, row, keyMap[id])` where `keyMap[id]` is `undefined`
silently yields a row carrying only the distance fields, which renders as
`undefined` in every metadata column. This shipped once as a regression.

Because dropping rows would otherwise make a MAX HITS *n* search return fewer
than *n* results, the store **over-requests 3×** from the distance service
(`OVER_REQUEST_FACTOR`, capped at `MAX_HITS_CEILING` 1500) and trims back to *n*
after filtering. `serviceResult` preserves the service's distance ordering, so
the trim keeps the closest matches. The service honors the larger request with
no meaningful time penalty — cost is dominated by the sketch comparison, not the
hit count.

This is an interim measure. It covers up to ~67% deprecated hits and degrades
gracefully beyond that (returning what survives). Remove it once the distance
service filters server-side, along with `MAX_HITS_PARAM`, which hardcodes the
index of `max_hits` in the `Minhash.compute_genome_distance_for_{genome2,fasta2}`
params array.
params array.

## Related repo: the Workspace service

The Workspace and download services live in a **separate repository**
(`../Workspace`, `BV-BRC/Workspace`), not in MAAGE-Web. Several MAAGE-Web
features depend on them:

| MAAGE-Web code | Depends on |
|---|---|
| `viewer/File.js` | `WorkspaceDownload` `/set-cookie-auth` and `/view` |
| Workspace browser DWNLD button | `Workspace.get_download_url` → `/download/{key}/{name}` |
| `WorkspaceManager.js` | the `Workspace` JSON-RPC service |

That repo has its own `CLAUDE.md` covering its runtime model and the 2026-09-24
download stall. Two things worth knowing from here:

- **The download service is single-threaded** (Twiggy, one process), unlike the
  25-worker RPC service. Anything that blocks it blocks every download. A stall
  that looks like "MAAGE-Web is slow" may be that service.
- Download keys and the `bvbrc_ws_view_session` cookie are **bearer secrets**.
  Anyone holding a download key can fetch the file without further auth.
