#!/usr/bin/env bash
# Green Africa local CI poller. Dedicated checkout only; no GitHub Actions.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
cd "$root"
if [[ ! -f .green-ci-dedicated-checkout ]]; then
  echo 'Refusing to run outside a dedicated CI checkout.' >&2
  exit 2
fi
branch="$(printenv GREEN_CI_BRANCH 2>/dev/null || true)"
if [[ -z "$branch" ]]; then branch="ops/cloud-dev-local-ci"; fi
if [[ ! "$branch" =~ ^[a-zA-Z0-9_./-]+$ ]] || [[ "$branch" == -* ]] || [[ "$branch" == *'..'* ]]; then
  echo 'Invalid trusted branch name' >&2
  exit 2
fi
if [[ "$(git remote get-url origin)" != "https://github.com/Daniel419797/GreenAfrica-RVM.git" ]]; then
  echo 'Unexpected Git remote; refusing' >&2
  exit 2
fi
mkdir -p .ci-runs
exec 9>.ci-runs/poller.lock
if ! flock -n 9; then
  echo 'A local CI run is already in progress.'
  exit 0
fi
free_kb="$(df -Pk "$root" | awk 'NR==2 {print $4}')"
if [[ "$free_kb" -lt 4000000 ]]; then
  echo 'Less than 4 GB free. Refusing CI build.' >&2
  exit 3
fi
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo 'CI checkout has uncommitted changes. Refusing checkout.' >&2
  exit 3
fi
git fetch --no-tags origin "refs/heads/$branch"
target="$(git rev-parse FETCH_HEAD)"
last="$(cat .ci-runs/last-attempted-sha 2>/dev/null || true)"
if [[ "$target" == "$last" ]]; then
  echo "No new commit: $target"
  exit 0
fi
git checkout --detach --force "$target"
printf '%s\n' "$target" > .ci-runs/last-attempted-sha
echo "Testing $branch at $target"
if node scripts/ci/run.mjs --scope=base,webapp,rvm-api,website --install; then
  printf '%s\n' "$target" > .ci-runs/last-success-sha
  echo 'Green Africa local CI passed'
else
  echo 'Green Africa local CI failed; inspect .ci-runs' >&2
  exit 1
fi
