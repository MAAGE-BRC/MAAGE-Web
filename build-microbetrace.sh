#!/usr/bin/env bash
set -euo pipefail

# On deployment systems, Node.js >=22.12.0 may not be the default.
# Prepend the known-good installation if the current node is too old.
NODE22=/disks/p3/nodejs/node-v22.22.3-linux-x64/bin
if [[ -d "$NODE22" ]] && ! node -e "
  const v = process.version.replace('v','').split('.').map(Number);
  if (v[0] < 22 || (v[0] === 22 && v[1] < 12)) process.exit(1);
" 2>/dev/null; then
  export PATH="$NODE22:$PATH"
fi

# Verify Node.js version (requires >=22.12.0 for Angular 21)
node_version=$(node -e "process.stdout.write(process.version)")
required="v22.12.0"
if ! node -e "
  const v = process.version.replace('v','').split('.').map(Number);
  const r = '22.12.0'.split('.').map(Number);
  if (v[0] < r[0] || (v[0] === r[0] && v[1] < r[1]) || (v[0] === r[0] && v[1] === r[1] && v[2] < r[2])) process.exit(1);
" 2>/dev/null; then
  echo "Error: Node.js ${required} or newer required (found ${node_version})" >&2
  exit 1
fi

echo "Node.js ${node_version} — OK"

# Ensure submodule is initialized
git submodule update --init microbetrace-src

# Reset files that the build modifies, so future pulls/updates are clean
(cd microbetrace-src && git checkout -- package-lock.json src/environments/version.prod.ts)

npm run build:microbetrace

echo "Done. Output in public/microbetrace/"
