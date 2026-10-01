#!/bin/sh
# Run the Dojo client build and fail if it regressed.
#
# buildClient.sh cannot be used as a pass/fail gate on its own: it exits 0
# even when the build reports errors. Measured on upstream/dev at the time of
# writing, a clean build exits 0 while reporting 21 errors and 98 warnings. A
# naive `./buildClient.sh` CI step would therefore go green on a broken build.
#
# Those 21 errors are structural rather than new. Most are error(311) "missing
# dependency" for libraries under public/maage/ -- echarts, markdown-it, d3v7,
# maage-themes -- which are deliberately NOT in release.profile.js because they
# are fetched at runtime from a URL rather than bundled. The builder cannot see
# them and says so, every time. Fixing that is a separate question (see
# PLAN-vendor-link-robustness.md); pretending it is clean is not an option
# either.
#
# So the gate is a ratchet: compare against a recorded baseline and fail only
# if the count goes UP. That catches a real regression -- a genuinely broken
# module, or the newer Closure compiler rejecting something -- without
# demanding the pre-existing noise be fixed first. Lower the baseline when the
# noise is reduced.
set -e

BASELINE_ERRORS=21

LOG=$(mktemp)
trap 'rm -f "$LOG"' EXIT

echo "Running client build..."
./buildClient.sh > "$LOG" 2>&1 || {
  echo "buildClient.sh exited non-zero:"
  tail -40 "$LOG"
  exit 1
}

errors=$(grep -c '^error(' "$LOG" || true)
warnings=$(grep -c '^warn(' "$LOG" || true)
echo "build completed: $errors errors, $warnings warnings (baseline: $BASELINE_ERRORS errors)"

if [ "$errors" -gt "$BASELINE_ERRORS" ]; then
  echo
  echo "FAIL: build errors increased from $BASELINE_ERRORS to $errors."
  echo "New or changed errors:"
  grep '^error(' "$LOG" || true
  exit 1
fi

if [ "$errors" -lt "$BASELINE_ERRORS" ]; then
  echo
  echo "Build errors DECREASED to $errors. Lower BASELINE_ERRORS in"
  echo "scripts/check-build.sh to $errors so the ratchet holds."
fi

# The build can report zero errors and still not have produced a bundle, so
# check the artifact exists rather than trusting the log.
if [ ! -f public/js/release/p3/layer/core.js ]; then
  echo "FAIL: build reported success but public/js/release/p3/layer/core.js is missing"
  exit 1
fi

echo "OK"
