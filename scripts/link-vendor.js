#!/usr/bin/env node
'use strict'

/*
 * Create the vendor symlinks declared in public/js/links.json.
 *
 * Runs from npm's postinstall hook, so it must be idempotent and must not
 * fail when node_modules is only partially populated: npm may invoke
 * postinstall before every optional dependency has landed. A link whose
 * target is missing is still created -- it is check-vendor-links.js's job to
 * complain about that, not this script's. Keeping creation and verification
 * separate means `npm install` does not fail for a reason the installer
 * cannot fix.
 *
 * Replaces hand-maintained `ln -sf` lines, which covered 2 of the 16 links
 * and let the other 14 drift.
 */

const fs = require('fs')
const path = require('path')
const vl = require('./vendor-links')

function main () {
  const manifest = vl.loadManifest()
  const existing = vl.currentLinks()
  let created = 0
  let repaired = 0
  let removed = 0

  Object.keys(manifest).forEach(function (name) {
    const want = manifest[name]
    const full = path.join(vl.LINK_DIR, name)

    if (Object.prototype.hasOwnProperty.call(existing, name)) {
      if (vl.sameTarget(existing[name], want)) { return }
      // Wrong target: replace rather than leave drift in place.
      fs.unlinkSync(full)
      fs.symlinkSync(want, full)
      repaired++
      console.log('  repaired ' + name + ' -> ' + want)
      return
    }

    /*
     * A non-symlink sitting at the link's path is not ours to delete -- it
     * may be a real directory someone created, or a Windows checkout that
     * materialised the link as a text file. Report and skip; the verifier
     * turns this into a hard failure.
     */
    if (fs.existsSync(full)) {
      console.warn('  SKIP ' + name + ': exists and is not a symlink')
      return
    }

    fs.symlinkSync(want, full)
    created++
    console.log('  created ' + name + ' -> ' + want)
  })

  // Links we own but no longer declare: remove, so deleting a manifest entry
  // is sufficient to retire a dependency.
  Object.keys(existing).forEach(function (name) {
    if (Object.prototype.hasOwnProperty.call(manifest, name)) { return }
    fs.unlinkSync(path.join(vl.LINK_DIR, name))
    removed++
    console.log('  removed stale ' + name)
  })

  if (created || repaired || removed) {
    console.log('vendor links: ' + created + ' created, ' + repaired +
      ' repaired, ' + removed + ' removed')
  }
}

main()
