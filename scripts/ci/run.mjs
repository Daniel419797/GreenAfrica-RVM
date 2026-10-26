#!/usr/bin/env node
/**
 * Green Africa CI, no GitHub Actions required.
 * Runs sequentially on Linux/macOS/Windows with local, secret-free processes.
 * Usage:
 *   node scripts/ci/run.mjs --scope=base,webapp,rvm-api,website --install
 *   node scripts/ci/run.mjs --scope=all --full --install
 */
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const argumentsList = process.argv.slice(2);
const has = (s) => argumentsList.includes(s);
const scopeValue = argumentsList.find((v) => v.startsWith('--scope='))?.slice(8) ?? 'all';
const fresh = has('--install');
const full = has('--full');
const listOnly = has('--list');
const stopOnFailure = has('--fail-fast');
const allowedScopes = ['base', 'webapp', 'website', 'rvm-api', 'rvm-mobile', 'recycler-mobile'];
const scopes = scopeValue === 'all' ? allowedScopes : scopeValue.split(',');
if (scopes.length === 0 || scopes.some((s) => !allowedScopes.includes(s))) {
  console.error('Usage: node scripts/ci/run.mjs [--scope=all|base,webapp,...] [--install] [--full] [--list] [--fail-fast]');
  process.exit(2);
}
if (listOnly) {
  console.log(allowedScopes.join('\n'));
  process.exit(0);
}

const id = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-') + '-' + process.pid;
const reportDir = join(root, '.ci-runs', id);
mkdirSync(reportDir, { recursive: true });
const platformWindows = process.platform === 'win32';
const npm = platformWindows ? 'npm.cmd' : 'npm';
const python = platformWindows ? 'python' : 'python3';
// Intentionally do not pass along private keys, tokens, Firebase admin secrets,
// cloud credentials or deployed blockchain addresses to test processes.
const keys = [
  'PATH', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'SystemRoot', 'SYSTEMROOT',
  'ComSpec', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL', 'TERM',
  'VIRTUAL_ENV', 'PYTHONPATH', 'SSL_CERT_FILE', 'NODE_EXTRA_CA_CERTS',
];
const cleanEnv = Object.fromEntries(keys.filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
Object.assign(cleanEnv, {
  CI: 'true',
  NODE_OPTIONS: '--max-old-space-size=512',
  NEXT_TELEMETRY_DISABLED: '1',
  GREENAFRICA_ENABLE_LIVE_REDEMPTION: 'false',
  BASE_NETWORK: 'sepolia',
  npm_config_audit: 'false',
  npm_config_fund: 'false',
  npm_config_jobs: '1',
  OMP_NUM_THREADS: '1',
  OPENBLAS_NUM_THREADS: '1',
  // Mock client values are only used to compile Next.js in --full mode.
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'greenafrica-ci',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'greenafrica-ci.appspot.com',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:1:web:test',
});
const steps = [];
let hasFailure = false;
const stepName = (name) => name.replace(/[^a-zA-Z0-9_-]/g, '_');
function writeReport(status = 'running') {
  const result = {
    version: 1, status, runId: id, scopes, full, installMissing: fresh,
    createdAt: startTime, updatedAt: new Date().toISOString(),
    hostname: (cleanEnv.HOSTNAME || 'local'), steps,
  };
  writeFileSync(join(reportDir, 'report.json'), JSON.stringify(result, null, 2) + '\n');
}
const startTime = new Date().toISOString();
writeReport();

async function command(name, cwd, program, args, timeoutMs = 300_000) {
  const startedAt = new Date().toISOString();
  const start = Date.now();
  const file = join(reportDir, stepName(name) + '.log');
  const stream = createWriteStream(file, { flags: 'w' });
  console.log('\n> ' + name + ' [' + cwd.replace(root, '.') + ']');
  stream.write('$ ' + program + ' ' + args.join(' ') + '\n');
  const child = spawn(program, args, {
    cwd, env: cleanEnv, windowsHide: true, shell: platformWindows && program === npm, detached: !platformWindows,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    // Kill the whole command group on Unix, including npm child processes.
    try {
      if (!platformWindows) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {}
  }, timeoutMs);
  const collect = (chunk) => { process.stdout.write(chunk); stream.write(chunk); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  const finished = await new Promise((done) => {
    child.on('error', (e) => done({ code: -1, error: String(e) }));
    child.on('close', (code, signal) => done({ code, signal }));
  });
  clearTimeout(timer);
  stream.end();
  await once(stream, 'finish');
  const status = finished.code === 0 && !timedOut ? 'passed' : 'failed';
  const entry = {
    name, status, startedAt, durationMs: Date.now() - start,
    exitCode: finished.code, timedOut, error: finished.error ?? null,
    log: file.slice(root.length + 1),
  };
  steps.push(entry);
  writeReport();
  if (status !== 'passed') { hasFailure = true; console.error('FAILED: ' + name); }
  return status === 'passed';
}
function blocked(name, message) {
  steps.push({ name, status: 'blocked', reason: message });
  hasFailure = true;
  writeReport();
  console.error('BLOCKED: ' + name + ': ' + message);
}
function skipped(name, message) {
  steps.push({ name, status: 'skipped', reason: message });
  writeReport();
  console.log('SKIPPED: ' + name + ': ' + message);
}
const paths = {
  base: 'base', webapp: 'webapp', website: 'website',
  'rvm-api': 'rvm_api', 'rvm-mobile': 'rvm', 'recycler-mobile': 'mobile',
};
async function installNpm(label, directory) {
  if (!existsSync(join(directory, 'package.json'))) return false;
  if (existsSync(join(directory, 'node_modules'))) return true;
  if (!fresh) { blocked(label + ':dependencies', 'Missing node_modules. Re-run with --install.'); return false; }
  if (!existsSync(join(directory, 'package-lock.json'))) {
    blocked(label + ':dependencies', 'No npm lockfile; reproducible npm ci unavailable.');
    return false;
  }
  return command(label + ':npm-ci', directory, npm, ['ci', '--no-audit', '--no-fund', '--prefer-offline'], 900_000);
}
async function runNpm(label, commands, options = {}) {
  const directory = join(root, paths[label]);
  if (!existsSync(join(directory, 'package.json'))) {
    skipped(label, 'Component not in this branch');
    return;
  }
  if (!(await installNpm(label, directory))) return;
  for (const [name, args, timeoutMs] of commands) {
    const result = await command(label + ':' + name, directory, npm, args, timeoutMs);
    if (!result || (stopOnFailure && hasFailure)) break;
  }
}
async function runPython() {
  const directory = join(root, paths['rvm-api']);
  if (!existsSync(directory)) { skipped('rvm-api', 'Component absent'); return; }
  const venvPython = join(directory, '.venv', platformWindows ? 'Scripts/python.exe' : 'bin/python');
  if (!existsSync(venvPython)) {
    if (!fresh) { blocked('rvm-api:dependencies', 'Missing Python .venv. Re-run with --install.'); return; }
    if (!(await command('rvm-api:venv', directory, python, ['-m', 'venv', '.venv'], 120_000))) return;
  }
  if (fresh && existsSync(join(directory, 'requirements.txt'))) {
    if (!(await command('rvm-api:pip-install', directory, venvPython,
      ['-m', 'pip', 'install', '--disable-pip-version-check', '--no-cache-dir', '-r', 'requirements.txt'], 900_000))) return;
  }
  const commands = [
    ['syntax', ['-m', 'compileall', '-q', 'app', 'main.py'], 120_000],
    ['tests', ['-m', 'unittest', 'discover', '-s', 'tests', '-v'], 300_000],
  ];
  for (const [name, args, timeoutMs] of commands) {
    const ok = await command('rvm-api:' + name, directory, venvPython, args, timeoutMs);
    if (!ok) break;
  }
}
const runners = {
  base: () => runNpm('base', [['contract-tests', ['test'], 600_000]]),
  webapp: () => runNpm('webapp', [
    ['security', ['exec', '--no', '--', 'node', '--test', 'tests/pilot-security.test.mjs'], 120_000],
    ['typecheck', ['exec', '--no', '--', 'tsc', '--noEmit'], 300_000],
    ['lint', ['run', 'lint', '--', '--quiet'], 300_000],
    ...(full ? [['build', ['run', 'build'], 600_000]] : []),
  ]),
  website: () => runNpm('website', [['build', ['run', 'build'], 300_000]]),
  'rvm-api': runPython,
  'rvm-mobile': () => runNpm('rvm-mobile', [['lint', ['run', 'lint'], 300_000]]),
  'recycler-mobile': () => runNpm('recycler-mobile', [
    ['tests', ['test'], 300_000],
    ['typecheck', ['run', 'typecheck'], 300_000],
    ...(full ? [['android-bundle', ['exec', '--no', '--', 'expo', 'export', '--platform', 'android'], 600_000]] : []),
  ]),
};

console.log('Green Africa local CI | ' + id + ' | components: ' + scopes.join(', ') + ' | install: ' + fresh + ' | full: ' + full);
for (const scope of scopes) {
  await runners[scope]();
  if (hasFailure && stopOnFailure) break;
}
const outcome = hasFailure ? 'failed' : steps.every((x) => x.status === 'skipped') ? 'skipped' : 'passed';
writeReport(outcome);
console.log('\nRESULT: ' + outcome.toUpperCase());
for (const step of steps) console.log((step.status === 'passed' ? 'PASS' : step.status.toUpperCase()) + ' ' + step.name);
console.log('Logs and JSON report: ' + reportDir);
process.exitCode = hasFailure ? 1 : 0;
