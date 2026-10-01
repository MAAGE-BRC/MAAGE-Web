# Making the npm-and-symlink pattern robust

> **Status (2026-10-01).** Phase A is implemented in PRs #213, #214, #215 and
> #216 and awaiting merge. Phase B — the Dojo submodule→npm migration and the
> 1.16.3 → 1.17.3 upgrade — is **not started**, and is the reason this
> document is worth keeping.
>
> The analysis below is preserved as written, in the present tense, because
> the evidence is the point. Two things it says were revised by implementing
> it; both are flagged inline where they occur:
>
> - **`json-schema` was NOT deleted.** `dbind/Validator.js` requires it. See
>   "Three submodules appear to be dead weight".
> - **A3 needed more than running `buildClient.sh`.** That exits 0 while
>   reporting 21 errors, so CI would have gone green on a broken build. See
>   "CI that actually builds".
>
> Durable conclusions have been folded into `CLAUDE.md`; this file keeps the
> evidence, the alternatives considered, and the Phase B sequencing.

## Context

Frontend libraries reach the browser by three different routes in this repo:

| route | examples | bundled by `buildClient.sh`? |
|---|---|---|
| git submodule under `public/js/` (22) | dojo, dijit, dgrid, d3, FileSaver | yes |
| **npm package symlinked into `public/js/` (16)** | cytoscape ×6, jquery, dagre, webcola, phyloxml, flag-icons, jbrowse | yes |
| vendored file under `public/maage/` | echarts, chart.js, d3v7, gridstack, topojson, markdown-it, highlight.js | **no** — fetched at runtime |

This plan is about the middle route. The symlinks are committed to git as mode
`120000` entries pointing into `node_modules`, e.g.
`public/js/cytoscape -> ../../node_modules/cytoscape`. They are registered as
AMD packages in `public/js/release.profile.js` and bundled by `buildClient.sh`
(Dojo's `build.sh` with Closure).

The pattern works, but nothing verifies it, and it has already drifted.

## The three failure modes

**1. Dangling symlink.** A committed link whose dependency is not installed —
or, worse, not declared.

Live example: `public/js/clipboard-js -> ../../node_modules/clipboard-js/` is
**broken right now**. `clipboard-js` appears nowhere in `package.json`, so no
`npm install` will ever satisfy it. It is currently harmless only because
nothing requires it — the app moved to the native `navigator.clipboard` — so it
is a dead link nobody noticed.

Note `npm ls clipboard-js` reports `(empty)` rather than an error, so npm's own
tooling does not surface this. A dedicated check is required.

**2. Drift between three lists.** `package.json` dependencies,
`public/js/*` symlinks, and `release.profile.js` AMD package names must agree,
and nothing enforces it. Name mismatches make the correspondence non-obvious:

```
flag-icon-css -> node_modules/flag-icons              (different name)
dagre.js      -> node_modules/dagre/dist/dagre.min.js (file, not directory)
JBrowse       -> jbrowse.repo/src/JBrowse/            (link to a link)
```

**3. `post_install.sh` ordering bug.** The script is nine lines:

```sh
cd public/js/
cp dagre.js ./release/              # (1) release/ may not exist
rm -rf ./jbrowse.repo
ln -sf ../../node_modules/jbrowse ./jbrowse.repo
cd ./jbrowse.repo/plugins/
if [ ! -h MultiBigWig ]; then
  ln -s ../../../node_modules/MultiBigWig .
fi
```

`public/js/release` is the Dojo **build output** directory, created by
`buildClient.sh`. It does not exist in a fresh checkout, so on a clean clone
line 3 fails. There is no `set -e`, so the failure is silent and ordering
dependent: it works only if you have already built.

Its git history (`d10e0dd98 Fix the multibigwig bug`, `d99d3090b cp dagre.js to
release dir`) shows each line was added reactively after a specific breakage.
It covers 2 of the 16 symlinks; the other 14 are unmanaged.

## Aggravating factor: CI builds nothing

All four workflows (`release.yml`, `release-tag.yml`, `hotfix.yml`,
`hotfix-tag.yml`) only bump versions, open release PRs, and tag. **None runs
`npm install`, `npm ci`, or `buildClient.sh`.**

Every failure above therefore surfaces on a developer's machine or in
production, never in CI. This is the single highest-value thing to change, and
it is worth doing even if the rest of this plan is rejected.

## Proposal

### 1. A declarative manifest — `public/js/links.json`

One source of truth for the symlink set, replacing convention with data:

```json
{
  "cytoscape":     "node_modules/cytoscape",
  "flag-icon-css": "node_modules/flag-icons",
  "dagre.js":      "node_modules/dagre/dist/dagre.min.js",
  "JBrowse":       "jbrowse.repo/src/JBrowse/"
}
```

Paths are repo-relative; the generator computes the relative link target. This
represents the name mismatches, the file-not-directory case and the
link-to-link case explicitly rather than by convention.

### 2. `scripts/link-vendor.js` — the generator

Idempotent: creates missing links, repairs wrong ones, removes stale ones not
in the manifest. Called from `postinstall`, replacing the hand-maintained
`ln -sf` lines. `post_install.sh` keeps only the genuinely odd nested
jbrowse-plugin link, with `mkdir -p ./release` and `set -e` added.

### 3. `scripts/check-vendor-links.js` — the verifier

Exits non-zero on any of:

- a symlink that dangles
- a symlink into `node_modules` whose package is not a declared dependency
- a manifest entry with no corresponding link
- a link under `public/js/` with no manifest entry

Prototyped against the live tree: it finds exactly one problem
(`clipboard-js` — both dangling and undeclared) and passes the other 15.

Wire as `npm run check:links`.

### 4. CI that actually builds — `.github/workflows/verify.yml`

On pull requests to `dev` and `main`:

```
npm ci  →  npm run check:links  →  ./buildClient.sh
```

This converts all three failure modes from silent to blocking.

> **Revised in implementation: the last step is wrong as written.**
> `buildClient.sh` **exits 0 even when the build reports errors** — on `dev`
> it exits 0 with 21 errors and 98 warnings. A `run: ./buildClient.sh` step
> would have gone green on a broken build, which is the exact failure this
> plan exists to prevent.
>
> `scripts/check-build.sh` runs the build and ratchets against a recorded
> `BASELINE_ERRORS`, failing only if the count rises, and asserts the bundle
> artifact exists. The baseline is not zero because most of those errors are
> structural: `public/maage/` libraries are runtime-loaded and invisible to
> the builder, and `heatmap/dist/*` is tagged `copyOnly`.
>
> They also cannot be suppressed in place. Severity in the Dojo builder is a
> pure function of the message id — `util/build/messages.js` maps 300–399 to
> `error` and hardcodes `amdMissingDependency` as 311 — and `depsScan.js`
> logs it unconditionally. No pragma, no allowlist, no profile override.
>
> Two of the 21 *were* genuinely fixable and were fixed in #216 (baseline now
> 19): `dagre` had no package entry in `release.profile.js`, and
> `MapsCanvas.js` used a leading-slash absolute path in a `dojo/text!`, which
> resolves only against the running server.
>
> This matters for Phase B: the ratchet is what will catch the newer Closure
> compiler rejecting something.

### 5. Make the symlink-vs-vendor choice deliberate

Once the npm path is verified and trustworthy, adding a library becomes a
policy decision rather than an accident:

- **npm + symlink** when the library is a well-behaved AMD module that belongs
  in the core bundle.
- **`public/maage/` vendoring** when it is loaded lazily, or cannot use the AMD
  path at all. highlight.js is a genuine instance of the latter: it ships no
  AMD wrapper (only a `var hljs` global), and a package named with a dot breaks
  Dojo's module resolver, so `require()` returns `undefined`.

## The 23 git submodules

A third route, and the largest by volume. Surveyed separately; the result
changes what is worth doing here.

**Most are not npm candidates, and the reason is not availability.** Every one
has a same-named package on npm. But comparing the npm package's repository
against the submodule's URL, **6 of 10 checked point at a different project**:

| submodule | npm package actually is | |
|---|---|---|
| `rbuels/lazyload` | `tuupola/lazyload` — an **image** lazyloader | different project |
| `rbuels/jDataView` | `jdataview/jdataview` | different fork |
| `dkasenberg/FileSaver.js` | `eligrey/FileSaver.js` | different fork |
| `kriszyp/dbind` | `yikeyatu/dbind` | different project |
| `nconrad/heatmap` | `substack/node-heatmap` | unrelated |
| `dmachi/circulus` | `rippertnt/circulus` | unrelated |

Substituting on a name match would be a supply-chain swap, not a migration.
`lazyload` is the sharpest case: the app uses it as a **script loader** (it is
how highlight.js is loaded in `viewer/Markdown.js`), and the npm package of
that name lazy-loads images.

A second structural obstacle: **17 of 23 submodules are pinned ahead of a tag
or have no tags at all.** Only dojo, dijit, util, put-selector and xstyle sit
on a clean tag. An arbitrary commit on master has no npm equivalent by
construction. (Sampled several — the extra commits are upstream history, not
local forks, so nothing is being lost; there is simply no published version
that corresponds.)

**`dgrid` is same-repo but must not be migrated.** npm has 1.3.3; the tree is
on 0.3.17-dev. That is a major-version API break across ~280 widgets — a dgrid
0.3→1.x port is a project, not a packaging change.

### Three submodules appear to be dead weight

Zero references in `public/js/p3/`, `release.profile.js`, `views/` or
`routes/`, and absent from the build profile:

- `autotrack` (Google Analytics helper, archived upstream)
- `raphael`
- `json-schema`

Deleting these is strictly better than migrating them. Note `archaeopteryx-js`
looks similar but **is** used, by `Phylogeny.js` and `Phylogeny2.js` — keep it.

> **Revised in implementation: only two were deleted.** `json-schema` has a
> live consumer — `dbind/Validator.js` opens with
> `require('json-schema/lib/validate')`, and `dbind` is in the build profile.
> It happens not to reach *this* build (`dbind/package.js` tags
> `dbind/Validator` as test and miniExclude, and `release.profile.js` sets
> `mini: true`), but that is a property of the current profile rather than of
> the code: a build with `mini: false` would break.
>
> `raphael` nearly went the same way. It looks live because jsphylosvg
> references `Raphael`, but jsphylosvg ships its own bundled `raphael-min.js`
> as a regular file, so the submodule really is unused.
>
> The lesson for Phase B: "zero grep hits in `p3/`" is not sufficient
> evidence that a submodule is dead. Check whether any *bundled* module
> requires it, and whether a lookalike is satisfying the reference from
> somewhere else.

### The Dojo family is the one coherent candidate

`dojo`, `dijit`, `dojox` and `util` are all pinned at the clean upstream tag
**1.16.3**, and all four are published on npm from the same repositories. Note
`util` maps to **`dojo-util`**, not `util` (which is Node's shim — a name trap
of the same kind as `lazyload`).

Decisively: **npm has 1.16.3 itself**, not only 1.17.3. Spot-checking
`_base/lang.js`, `parser.js` and `store/Memory.js`, the npm `dojo@1.16.3`
tarball is **byte-identical** to the submodule checkout. So the packaging
change can be made provably a no-op, entirely separate from any version bump.

Pin exactly. `dojo`'s `latest` dist-tag is a sane `1.17.3`, but 2.0 alphas are
published to the registry (`2.0.0-alpha4` is the most recently published
version, and a `beta` tag points at `2.0.0-alpha.7`) — a different, rewritten
major line. Use exact versions, not caret ranges. Upstream also maintains a
`patch1.16` tag, currently `1.16.5`, if a within-line patch is wanted before
committing to 1.17.

`xstyle` is a smaller instance of the same case (same repo, in-tree v0.3.2 vs
npm 0.3.3).

## The Dojo 1.16.3 → 1.17.3 upgrade

Read from submodule history rather than release notes: 26 commits in `dojo`,
16 in `dijit`, 16 in `dojox`, 13 in `util`. The raw diffstat (488 files,
+58k/−27k) is misleading — nearly all of it is CLDR locale data. Excluding
CLDR, NLS and tests, dojo's real delta is 19 files, +1227/−415, most of it one
new vendored file.

**Security — the reason this is worth doing:**

- **CVE-2021-23450**, prototype pollution in `dojo/_base/lang.js`. Four-line
  fix: `setObject` now rejects `__proto__` and `constructor` path segments.
- **GHSA-jxfh-8wgv-vfr2**, one line in `request/util.js`.

The app currently ships the vulnerable 1.16.3. Direct exposure to the first
looks low (zero `setObject` calls in `public/js/p3/`), but it is a real CVE
against a shipped dependency and will appear in any scan.

**Functional changes:**

- **JSON5 parser added** (~900 lines, the bulk of the non-CLDR diff).
  `parser.js` uses `json5.parse` for `data-dojo-props` **when
  `has('csp-restrictions')` is true**, else falls back to `eval`. This repo
  sets neither that flag nor a `staticHasFeatures` entry for it, so the eval
  path is retained and the heavily-used `data-dojo-props` templates are
  unaffected. Worth re-checking if CSP is ever tightened.
- **`dojo/store/Memory` / `Observable`**: new `options.before` support, plus a
  1.17.2 regression fix (`put` inserted at the start instead of the end; the
  index was not cleared on remove). The likeliest source of subtle breakage,
  since the app uses Dojo stores throughout.
- `_base/array.js`, `_base/declare.js`, `_base/kernel.js`: `new Function` calls
  wrapped in CSP checks; block-scoped functions converted to named function
  expressions.
- `dijit` and `dojox` are nearly inert — 9 and 7 files, mostly tests.

**The build-tooling risk is in `util`,** which `buildClient.sh` depends on via
`public/js/util/buildscripts/build.sh`:

- **Closure compiler jar replaced**, 10.8 MB → 13.5 MB. Newer compilers are
  stricter; this is where a previously-passing build can start failing.
- `build/buildControl.js` now defaults `languageIn: ECMASCRIPT_2017` /
  `languageOut: ECMASCRIPT3` when closure is used. This repo sets both
  explicitly to `ECMASCRIPT_2018` in `release.profile.js:4-6`, so the new
  defaults do not apply — but note upstream's comment says `ECMASCRIPT3` output
  exists "to preserve compatibility with older browsers," and this repo
  diverges from that.

## The Windows question

**Committed symlinks are the part of this pattern that does not survive a
Windows checkout, and it fails in a way that looks like missing files rather
than like a symlink problem.**

Git stores these as mode `120000` blobs whose content is the target path. On
checkout, Git can only materialize a real symlink if `core.symlinks` is true.
On Windows it defaults to **false** unless the user has Developer Mode enabled
or is running elevated, because creating a symlink is a privileged operation
there. With `core.symlinks=false`, Git writes each entry as a **regular text
file containing the target path** — so `public/js/cytoscape` becomes a 28-byte
file containing the literal text `../../node_modules/cytoscape`.

The consequence is a confusing failure: the path exists, so "file not found"
checks pass, but the Dojo loader fetches it and gets a path string instead of
JavaScript. The build or the page fails somewhere far from the cause.

This repo currently has **18 tracked symlinks**, so the blast radius is wide:

- 16 at the top level of `public/js/` (the npm links in scope here)
- 2 nested and intra-repo, outside the manifest's scope but affected the same
  way: `public/js/msa/dist/msa.min.js -> msa.js` and
  `public/js/p3/resources/jbrowse/img -> ../../../jbrowse.repo/img`

`package.json` declares no `engines` and no `os` field, and no documentation
mentions Windows or WSL — so the current platform assumption is implicit rather
than stated. The build tooling is POSIX shell (`buildClient.sh`,
`post_install.sh`, `build-microbetrace.sh`), which already means a Windows
developer needs WSL or Git Bash regardless of symlinks.

**How this plan affects it.** Generating the links from a manifest at
`postinstall` means they no longer need to be *committed*. If they are
generated and then gitignored, the Windows checkout problem disappears for the
16 npm links: nothing of mode `120000` is checked out, and `npm install` creates
real links — on Windows, Node's `fs.symlink` falls back to a junction for
directories, which works without elevation.

That is a genuinely attractive side effect, but it is a **bigger change** than
the rest of the plan:

- It alters what is in the tree, so any tooling or deployment that consumes a
  checkout without running `npm install` would break.
- It does not help the two nested intra-repo symlinks, which are not
  npm-derived.
- It does not make the POSIX build scripts run on native Windows.

**Recommendation:** keep it out of the first pass. Land the manifest, the
verifier and CI first; once links are generated rather than hand-maintained,
flipping them to gitignored is a small follow-up that can be evaluated on its
own. If Windows support is not actually a goal, the cheaper honest fix is to
declare it: add `"engines"` and a line in the README stating that WSL or Git
Bash is required.

## Is the Dojo upgrade part of this, or a separate project?

**Separate project — but strictly after this one, and this one is what makes
it affordable.**

The two are not the same kind of work:

| | this plan | Dojo upgrade |
|---|---|---|
| changes what ships to the browser | no | **yes** |
| verifiable by a green build | yes | no — needs UI testing across ~280 widgets |
| revertible cheaply | yes | yes, but only if you can tell what broke |
| blast radius | build tooling | every page |

Bundling them would destroy the main diagnostic. If the Closure jar is
replaced in the same change that re-plumbs how modules are sourced, a build
failure is ambiguous between "newer compiler," "packaging change" and "library
regression." Keeping them apart means each change has exactly one suspect.

**The dependency runs one way.** The upgrade wants CI that actually builds —
which does not exist today (see above) — so that a Closure failure is caught
in a PR rather than by a developer. Land the infrastructure first and the
upgrade becomes a normal reviewable change; do it in the other order and the
upgrade is a leap.

**Packaging and version bump must also be separate from each other.** Because
npm publishes 1.16.3 and its tarball is byte-identical to the submodule
checkout, the migration can be landed as a provable no-op — verified by diffing
the built bundle before and after — and the version bump can then be a pure
content change against known-good plumbing. Collapsing them forfeits that.

## Sequencing

Phase A — build infrastructure (this plan). Planned as three PRs; shipped as
four, each independently useful and revertible. **Merge in order** — each
stacks on the previous.

| PR | Content | Status |
|---|---|---|
| [#213](https://github.com/MAAGE-BRC/MAAGE-Web/pull/213) | Delete the dead `clipboard-js` link and the `autotrack`/`raphael` submodules; `mkdir -p ./release` and `set -e` in `post_install.sh` | open, CI green |
| [#214](https://github.com/MAAGE-BRC/MAAGE-Web/pull/214) | `links.json`, `link-vendor.js`, `check-vendor-links.js`; `postinstall` calls the generator | open, CI green |
| [#215](https://github.com/MAAGE-BRC/MAAGE-Web/pull/215) | `verify.yml` + `check-build.sh` (the ratchet) | open, CI green |
| [#216](https://github.com/MAAGE-BRC/MAAGE-Web/pull/216) | Fix the two fixable build errors (21 → 19); `CLAUDE.md` | open, CI green |

#216 was not in the original plan — it exists because investigating the
build-error baseline for #215 turned up two that were real defects rather
than structural noise.

CI was verified on GitHub, not only locally: error counts match exactly
(21/98 on #215, 19/99 on #216) on `ubuntu-latest` with Java 11 and Node 22,
versus Java 8 and Node 24 locally. The Closure build behaves identically.

Phase B — Dojo, as its own project, only after A3 is green.

| PR | Content | Risk |
|---|---|---|
| B1 | Move `dojo`, `dijit`, `dojox`, `util`→`dojo-util` from submodule to npm, **pinned at 1.16.3**; add to `links.json`. Expected to be a byte-level no-op | low, and provable |
| B2 | Bump all four to 1.17.3 | **moderate — needs UI testing** |

B1 acceptance: the built bundle is unchanged. B2 acceptance: `buildClient.sh`
passes with the new Closure jar, and the store-heavy screens (grids,
`dojo/store/Memory` consumers) are exercised by hand — a green build does not
cover the `Memory.put` ordering fix.

`xstyle` can ride along in B1 or be skipped; it is small either way.

Deliberately **not** in any of these: gitignoring the symlinks (see above),
migrating any `public/maage/` library to npm, and `dgrid` (a 0.3→1.x port is
its own project, unrelated to packaging).

## Risks

- ~~**A3 may fail on its first run.**~~ *Resolved: it passes. The build runs
  in ~1m40s in CI and ~19s locally.*
- ~~**`buildClient.sh` runtime.**~~ *Resolved: ~2 minutes in CI including
  `npm ci` and a recursive submodule checkout, which is cheap enough to run on
  every PR. The fallback (link check on every PR, build only on PRs to `main`)
  is unnecessary for now.*
- ~~**A2 must be a no-op in effect.**~~ *Resolved, but it required a design
  change: the committed links are inconsistently spelled — nine carry a
  trailing slash and `phyloxml` has a redundant `./` — so the scripts compare
  targets **normalised** rather than literally. Rewriting them to canonical
  form would have made A2 modify the tree for no behavioural gain. Worth
  preserving in B1, where the same trap applies.*
- **Deleting a submodule is slightly fiddly** (A1): `git submodule deinit -f`,
  `git rm -f`, then drop `.git/modules/<path>`. A stale `.git/modules` entry
  makes a later re-add fail confusingly. *This caution paid off — the wider
  check caught `json-schema`, which grep over `p3/` had called dead.*
- **B2's real risk is not the build.** The Closure jar is the visible hazard,
  but the `dojo/store/Memory` ordering fix is the one that can pass CI and
  still change behavior. Any code that relied on `put` inserting at the start
  will silently reorder.
- **Pin Dojo exactly.** `latest` is a sane 1.17.3, but 2.0 alphas are on the
  registry (most recently published version is `2.0.0-alpha4`; the `beta` tag
  is `2.0.0-alpha.7`). Use exact versions, not caret ranges.
