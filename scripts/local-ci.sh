#!/usr/bin/env bash
# Green Africa single-instance, low-priority runner.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
mkdir -p .local-ci
if command -v flock >/dev/null 2>&1; then
  exec 9>.local-ci/runner.lock
  if ! flock -n 9; then echo "Green Africa CI already running" >&2; exit 75; fi
fi
export CI=true NEXT_TELEMETRY_DISABLED=1
# The Node runner applies per-job heap limits. Preserve only caller-set NODE_OPTIONS.
if command -v nice >/dev/null 2>&1; then exec nice -n 10 node scripts/local-ci.mjs "$@"; fi
exec node scripts/local-ci.mjs "$@"
