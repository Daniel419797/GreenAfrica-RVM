#!/usr/bin/env node
// Green Africa sequential local CI: no deployments, production credentials or auto-installs.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hostname } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw Error('Missing value for ' + name);
  return args[index + 1];
}
const profile = option('--profile', 'smoke');
if (!['smoke', 'full'].includes(profile)) throw Error('Expected --profile smoke or full');
const selected = option('--only', '').split(',').map(s => s.trim()).filter(Boolean);
const timeoutMinutes = Number(option('--timeout-minutes', '12'));
if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > 60) throw Error('Timeout must be 1..60 minutes');
const python = process.env.GREENAFRICA_CI_PYTHON || 'python3';
const jobs = [
  ['base-contract', 'base', 'npm', ['test'], 'smoke', true],
  ['webapp-security', 'webapp', 'node', ['--test', 'tests/pilot-security.test.mjs'], 'smoke'],
  ['webapp-types', 'webapp', 'node', ['node_modules/typescript/bin/tsc', '--noEmit'], 'smoke', true],
  ['webapp-lint', 'webapp', 'npm', ['run','lint','--','--quiet'], 'smoke', true],
  ['website-build', 'website', 'npm', ['run','build'], 'smoke', true],
  ['rvm-api-compile', 'rvm_api', python, ['-m','compileall','-q','app','main.py'], 'smoke'],
  ['rvm-api-test', 'rvm_api', python, ['-m','unittest','discover','-s','tests','-v'], 'full'],
  ['rvm-mobile-lint', 'rvm', 'npm', ['run','lint'], 'full', true],
  ['webapp-build', 'webapp', 'npm', ['run','build'], 'full', true],
  ['recycler-mobile-test', 'mobile', 'npm', ['test'], 'full', true, true],
  ['recycler-mobile-types', 'mobile', 'node', ['node_modules/typescript/bin/tsc','--noEmit'], 'full', true, true],
];
if (args.includes('--help')) {
  console.log('bash scripts/local-ci.sh [--profile smoke|full] [--only job1,job2] [--list] [--report-dir path] [--timeout-minutes 12]');
  process.exit(0);
}
if (args.includes('--list')) { jobs.forEach(j => console.log(j[0] + ' [' + j[4] + ']')); process.exit(0); }
const unknown = selected.filter(x => !jobs.some(j => j[0] === x));
if (unknown.length) throw Error('Unknown jobs: ' + unknown.join(','));
const planned = jobs.filter(j => selected.length ? selected.includes(j[0]) : j[4] === 'smoke' || profile === 'full');
function git(a) { try { return execFileSync('git', a, {cwd:root,encoding:'utf8',timeout:3000,stdio:['ignore','pipe','ignore']}).trim(); } catch {return 'unknown';} }
const runId = new Date().toISOString().replace(/[:.]/g,'-') + '-' + process.pid;
const output = option('--report-dir','.local-ci');
const dir = join(isAbsolute(output) ? output : resolve(root,output),runId);
mkdirSync(dir,{recursive:true,mode:0o700});
const report = {schema:1, runId, host:hostname(), profile, gitSha:git(['rev-parse','HEAD']),
 gitDirty:git(['status','--porcelain']) !== '', startedAt:new Date().toISOString(), results:[]};
function save() {
 const summary = {passed:0,failed:0,skipped:0};
 for(const r of report.results) summary[r.status]++;
 report.summary=summary;
 writeFileSync(join(dir,'report.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
 const lines=['# Green Africa local CI','','Run: '+runId,'Commit: '+report.gitSha,
  'Dirty checkout: '+report.gitDirty,'Started: '+report.startedAt,'Finished: '+(report.finishedAt||'running'),
  '','| Job | Status | Seconds | Log |','|---|---|---:|---|'];
 for (const r of report.results) lines.push('| '+r.id+' | '+r.status+(r.reason?': '+r.reason:'')+
  ' | '+Math.round(r.durationMs/1000)+' | '+r.log+' |');
 lines.push('','Totals: '+summary.passed+' passed, '+summary.failed+' failed, '+summary.skipped+' skipped');
 writeFileSync(join(dir,'report.md'),lines.join('\n')+'\n',{mode:0o600});
}
async function run(job) {
 const [id,subdir,command,cmdArgs,,requireModules,optionalProject] = job;
 const folder=join(root,subdir), log=id+'.log', logfile=join(dir,log), start=Date.now();
 const finish=(status,reason)=>({id,status,...(reason?{reason}:{}),durationMs:Date.now()-start,log});
 if(!existsSync(folder)) {
  const reason=optionalProject?'Optional mobile app not present':'Missing project directory';
  writeFileSync(logfile,reason+'\n',{mode:0o600});
  return finish(optionalProject?'skipped':'failed',reason);
 }
 if(requireModules&&!existsSync(join(folder,'node_modules'))) {
  const reason='Missing dependencies; run npm ci in '+subdir+' first';
  writeFileSync(logfile,reason+'\n',{mode:0o600});
  return finish('failed',reason);
 }
 const fd=openSync(logfile,'w',0o600);
 const env={...process.env,CI:'true',NEXT_TELEMETRY_DISABLED:'1',
  npm_config_audit:'false',npm_config_fund:'false',
  NODE_OPTIONS:process.env.NODE_OPTIONS||(id === 'webapp-build' ? '--max-old-space-size=896' : '--max-old-space-size=512')};
 // CI never needs secrets, even when the operator shell exports them.
 for(const key of ['BASE_OPERATOR_PRIVATE_KEY','GREENAFRICA_OPERATOR_MNEMONIC',
  'TERMII_API_KEY','FIREBASE_PRIVATE_KEY','FIREBASE_CLIENT_EMAIL']) delete env[key];
 if(id === 'webapp-build') {
  // Syntactically valid placeholders for Firebase's server-side SDK initialization.
  // Never contact real Firebase, redeem rewards, or sign Base transactions in a build.
  Object.assign(env, {
   NEXT_PUBLIC_FIREBASE_API_KEY:'AIzaSy' + 'A'.repeat(33),
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:'greenafrica-ci.firebaseapp.com',
   NEXT_PUBLIC_FIREBASE_PROJECT_ID:'greenafrica-ci',
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'greenafrica-ci.appspot.com',
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:'123456789012',
   NEXT_PUBLIC_FIREBASE_APP_ID:'1:123456789012:web:aaaaaaaaaaaaaaaaaaaaaa',
   GREENAFRICA_ENABLE_LIVE_REDEMPTION:'false',
   GREENAFRICA_LOCAL_CI_SEPARATE_CHECKS:'true',
   BASE_NETWORK:'sepolia',
  });
 }
 const outcome=await new Promise(done=>{
  let timedOut=false,completed=false;
  const p=spawn(command,cmdArgs,{cwd:folder,env,stdio:['ignore',fd,fd],
   detached:process.platform!=='win32',windowsHide:true});
  const timer=setTimeout(()=>{
   timedOut=true;
   try { if(process.platform==='win32')p.kill('SIGTERM'); else if(p.pid)process.kill(-p.pid,'SIGTERM'); } catch {}
  },timeoutMinutes*60*1000);
  const end=(result)=>{if(completed)return;completed=true;clearTimeout(timer);done(result);};
  p.on('error',e=>end(finish('failed','Cannot launch: '+e.message)));
  p.on('close',(code,signal)=>end(timedOut?finish('failed','timed out'):
    code===0?finish('passed'):finish('failed','exit '+code+(signal?' '+signal:''))));
 });
 closeSync(fd);
 return outcome;
}
console.log('Green Africa local CI ('+profile+') | '+planned.length+' jobs | '+dir);
for(const job of planned) {
 console.log('[START] '+job[0]);
 const outcome=await run(job);
 report.results.push(outcome);save();
 console.log('['+outcome.status.toUpperCase()+'] '+outcome.id+
  ' '+Math.round(outcome.durationMs/1000)+'s'+(outcome.reason?' '+outcome.reason:''));
}
report.finishedAt=new Date().toISOString();save();
console.log('Results: '+join(dir,'report.md'));
process.exitCode=report.summary.failed?1:0;
