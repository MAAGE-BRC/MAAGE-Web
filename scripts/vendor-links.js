'use strict'

/*
 * Shared loader for public/js/links.json.
 *
 * The manifest maps a symlink name under public/js/ to its target, written
 * exactly as the link content should be (relative to public/js/). Keys
 * beginning with '_' are comments and are skipped -- JSON has no comment
 * syntax and the alternative, a sidecar README nobody reads, is worse.
 */

const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.resolve(__dirname, '..')
const LINK_DIR = path.join(REPO_ROOT, 'public', 'js')
const MANIFEST = path.join(LINK_DIR, 'links.json')

function loadManifest () {
  const raw = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  const entries = {}
  Object.keys(raw).forEach(function (k) {
    if (k.charAt(0) === '_') { return }
    entries[k] = raw[k]
  })
  return entries
}

/*
 * Every symlink currently present at the top level of public/js. Uses
 * lstat, not stat: stat follows the link and would report the target's type,
 * so a dangling link would look like it does not exist at all.
 */
function currentLinks () {
  const found = {}
  fs.readdirSync(LINK_DIR).forEach(function (name) {
    const p = path.join(LINK_DIR, name)
    let st
    try { st = fs.lstatSync(p) } catch (e) { return }
    if (!st.isSymbolicLink()) { return }
    found[name] = fs.readlinkSync(p)
  })
  return found
}

/*
 * The npm package a link resolves into, or null if it points somewhere else
 * in the tree (JBrowse -> jbrowse.repo/... is the one such case). Used to
 * check the target is actually a declared dependency.
 */
function packageOf (target) {
  const m = String(target).match(/node_modules\/([^/]+)/)
  return m ? m[1] : null
}

/*
 * Compare link targets without tripping over cosmetic spelling. The committed
 * links are inconsistent -- some carry a trailing slash, phyloxml has a
 * redundant './' prefix -- and all of them resolve identically. Normalising
 * at comparison time rather than rewriting the tree keeps the manifest
 * introduction a true no-op; rewriting 10 links to canonical form would be a
 * change to what is checked out, for no behavioural gain.
 */
function sameTarget (a, b) {
  return normalizeTarget(a) === normalizeTarget(b)
}

function normalizeTarget (t) {
  return String(t).replace(/^\.\//, '').replace(/\/+$/, '')
}

function declaredDeps () {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'))
  return Object.assign({}, pkg.dependencies, pkg.devDependencies)
}

module.exports = {
  REPO_ROOT: REPO_ROOT,
  LINK_DIR: LINK_DIR,
  MANIFEST: MANIFEST,
  loadManifest: loadManifest,
  currentLinks: currentLinks,
  packageOf: packageOf,
  sameTarget: sameTarget,
  declaredDeps: declaredDeps
}
