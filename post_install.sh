#!/bin/sh
# Runs as npm's postinstall hook.
#
# set -e so a failure here is visible. Without it this script exits 0 no matter
# what went wrong, and a missing link surfaces much later as a module that
# loads as a path string instead of JavaScript.
set -e

cd public/js/

# release/ is the Dojo build output directory, created by buildClient.sh. It
# does not exist in a fresh checkout, so create it rather than failing -- this
# script runs on npm install, which happens before any build.
mkdir -p ./release
cp dagre.js ./release/

# jbrowse is relinked unconditionally: npm may have replaced node_modules/jbrowse
# wholesale, which leaves the old link pointing at a stale inode.
rm -rf ./jbrowse.repo
ln -sf ../../node_modules/jbrowse ./jbrowse.repo

# MultiBigWig is a jbrowse *plugin*, so it has to live inside the jbrowse tree
# rather than alongside the other links in public/js.
cd ./jbrowse.repo/plugins/
if [ ! -h MultiBigWig ]; then
  ln -s ../../../node_modules/MultiBigWig .
fi
