# Green Africa local CI (no GitHub Actions)

Run sequential, resource-bounded builds on a Windows PC or Linux cloud-dev. Requirements: Node.js 22+, npm 10+, Python 3.12 for RVM API.

## Manual

```bash
node scripts/ci/run.mjs --scope=base --install
node scripts/ci/run.mjs --scope=base,webapp,rvm-api,website --install
node scripts/ci/run.mjs --scope=all --install --full
```

Use `--install` for missing node_modules and npm ci. `--scope=all` covers Base contract, webapp, website, RVM API, technician mobile, and recycler mobile when present. `--full` includes Next.js production build and, if available, Android JS bundle export (not an APK). `--fail-fast` stops early. `--list` enumerates scopes.

Each run writes logs and machine-readable results under `.ci-runs/<timestamp>/`. Absent components are explicitly `skipped`; missing dependencies are `blocked`; failed tests are `failed`. A partial passing run is not full pilot release approval.

The runner strips deployment keys and Firebase Admin secrets from subprocess environments, sets `GREENAFRICA_ENABLE_LIVE_REDEMPTION=false`, and uses test-only Firebase client values for builds. It cannot make a live contract deployment or pay airtime.

## Optional automatic polling

`scripts/ci/poll.sh` checks a **trusted** GitHub branch for a new SHA and runs the selected scopes once per SHA. It refuses to run without the marker `.green-ci-dedicated-checkout`, a fixed official GitHub origin, a clean working tree, an exclusive lock, and at least 4 GB free disk. Use it only inside a dedicated checkout, never a developer working tree.

Example user crontab after security review:

```cron
*/15 * * * * cd /home/azureuser/workspaces/greenafrica-ci-runner && /bin/bash scripts/ci/poll.sh >> /home/azureuser/greenafrica-ci-poller.log 2>&1
```

**Do not enable unattended execution of untrusted PR code.** Prefer a dedicated unprivileged account or container/VM, a protected branch, restricted host permissions, and no deploy credentials. Polling and build time still consume VM resources and can produce infrastructure charges.

## Release gates not covered by local unit tests

Real PET material validation, hardware acceptance, Firestore security rules, Base Sepolia verified deployment, ledger reconciliation, and airtime provider fulfilment still require separate staging acceptance tests. Never merge or deploy the production release just because local unit tests pass.