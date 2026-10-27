# Green Africa: self-hosted CI

GitHub Actions is optional. Run the checks on cloud-dev or your own PC. Windows runs the Node entry point directly; Linux can use the locking shell wrapper.

## Setup (once per checkout)
Install Node.js 22+, npm, Python 3.12+, and Git. Install project dependencies:

    (cd base && npm ci --no-audit --no-fund)
    (cd webapp && npm ci --no-audit --no-fund)
    (cd website && npm ci --no-audit --no-fund)
    (cd rvm && npm ci --no-audit --no-fund)

The full RVM API test additionally needs its Python requirements in a venv:

    python3 -m venv rvm_api/.venv
    rvm_api/.venv/bin/pip install -r rvm_api/requirements.txt

Select the venv with GREENAFRICA_CI_PYTHON=<absolute-path-to-venv-python>.
The optional recycler mobile app (PR #2) must be present and have npm dependencies installed to run its tests.

## Commands
From repository root:

    bash scripts/local-ci.sh --list
    bash scripts/local-ci.sh --profile smoke
    bash scripts/local-ci.sh --profile full

On Windows PowerShell (without requiring Bash):

    node scripts/local-ci.mjs --profile smoke
    node scripts/local-ci.mjs --profile full

Set `GREENAFRICA_CI_PYTHON` to your Python virtualenv executable using your OS's environment syntax. Do not run these jobs from an administrator terminal with production wallet credentials.
    bash scripts/local-ci.sh --only base-contract,webapp-security,webapp-types
    bash scripts/local-ci.sh --profile full --timeout-minutes 20

Smoke covers Base contract tests, web security, TypeScript, lint, Astro build, and RVM Python source compilation.
Full adds Next.js build, Python API tests, RVM device app lint and optional recycler mobile checks.
Tasks run sequentially. Missing dependencies fail the job rather than pretending it passed.
The runner NEVER automatically installs packages or deploys Base contracts.

## Evidence
Each invocation creates .local-ci/<timestamp-pid>/report.json, report.md and per-job logs.
Exit 0 = all required checks passed; exit 1 = one or more failed; exit 75 = a run is already in progress.
Reports are excluded from Git. SHA and dirty-worktree status are recorded.
Results remain on the executing machine and are not uploaded automatically.

## Resource controls and security
Cloud-dev has limited memory. Jobs use a 512 MiB Node heap by default, with a tested 896 MiB heap for the production Next.js build, and a per-job timeout. Swap may be used on the 897 MiB VM; a Next.js build can still fail under memory/disk pressure.
The shell wrapper uses flock to prevent concurrent runs and nice on Linux.
Do not run untrusted pull request code as a user with production credentials.
Pin an isolated checkout before attaching a systemd timer or scheduled webhook.
CI is an evidence gate, not permission to release. Base Sepolia deployment,
RVM hardware verification, Firestore rules and reward settlement still require separate acceptance tests.

The Node runner passes an allowlisted OS environment to child jobs and never forwards wallet private keys, cloud credentials or production Firebase Admin secrets. For extra safety, use a dedicated OS account with no production credentials. GitHub-hosted CI is not part of the build path.
