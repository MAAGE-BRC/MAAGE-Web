#!/usr/bin/env node
'use strict'

/*
 * Verify the vendor symlinks under public/js. Exits non-zero on any problem,
 * so CI blocks rather than shipping a broken bundle.
 *
 * This exists because every failure in this area is silent. A dangling link
 * is not a missing file -- the path exists, so existence checks pass, and the
 * Dojo loader fetches it and gets a path string instead of JavaScript, failing
 * somewhere far from the cause. And npm will not help: `npm ls <pkg>` reports
 * "(empty)" for a symlink whose package is undeclared, which is exactly how
 * the dangling clipboard-js link survived unnoticed.
 *
 * Four classes of problem, all of which have actually occurred here or are a
 * step away:
 *
 *   dangling    link whose target does not resolve
 *   undeclared  link into node_modules for a package not in package.json,
 *               so no npm install will ever create it
 *   missing     manifest entry with no link on disk
 *   unmanaged   link on disk with no manifest entry (drift)
 *   notalink    path exists but is not a symlink -- the Windows
 *               core.symlinks=false case, where git writes a text file
 *               containing the target path
 */

const fs = require('fs')
const path = require('path')
const vl = require('./vendor-links')

function main () {
  const manifest = vl.loadManifest()
  const existing = vl.currentLinks()
  const deps = vl.declaredDeps()
  const problems = []

  Object.keys(manifest).forEach(function (name) {
    const full = path.join(vl.LINK_DIR, name)
    const want = manifest[name]

    if (!Object.prototype.hasOwnProperty.call(existing, name)) {
      if (fs.existsSync(full)) {
        problems.push([name, 'notalink',
          'exists but is not a symlink (Windows checkout without core.symlinks?)'])
      } else {
        problems.push([name, 'missing', 'declared in links.json but absent -- run npm run link:vendor'])
      }
      return
    }

    if (!vl.sameTarget(existing[name], want)) {
      problems.push([name, 'drift',
        'points at ' + existing[name] + ', manifest says ' + want])
    }

    // fs.existsSync follows the link, so false here means the target is gone.
    if (!fs.existsSync(full)) {
      problems.push([name, 'dangling', '-> ' + existing[name]])
    }

    const pkg = vl.packageOf(want)
    if (pkg && !Object.prototype.hasOwnProperty.call(deps, pkg)) {
      problems.push([name, 'undeclared',
        '"' + pkg + '" is not in package.json -- no npm install can satisfy this'])
    }
  })

  Object.keys(existing).forEach(function (name) {
    if (Object.prototype.hasOwnProperty.call(manifest, name)) { return }
    problems.push([name, 'unmanaged',
      '-> ' + existing[name] + ' (not in links.json)'])
  })

  const total = Object.keys(manifest).length
  if (!problems.length) {
    console.log('vendor links OK (' + total + ' checked)')
    return
  }

  console.error('vendor link problems (' + problems.length + ' of ' + total + ' checked):')
  problems.forEach(function (p) {
    console.error('  ' + p[0] + ' [' + p[1] + '] ' + p[2])
  })
  process.exit(1)
}

main()
