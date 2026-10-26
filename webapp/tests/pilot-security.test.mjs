import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

// These are boundary regression checks, not substitutes for Firebase, hardware
// or live-fulfilment end-to-end testing.
test('only authenticated read access is exported as a public Green Points Server Action', () => {
  const actions = read('src/actions/greenpoints.ts');
  assert.match(actions, /verifyRecyclerToken\(idToken\)/);
  assert.doesNotMatch(actions, /export async function (mint|burn|adjust)PointsForUser/);
  assert.match(actions, /getMyPointsFromBlockchain/);
});

test('internal point mutations are not public Next.js Server Actions', () => {
  const internal = read('src/lib/algorand/server-points.ts');
  assert.doesNotMatch(internal, /^['"]use server['"];/m);
  assert.match(internal, /export async function mintPointsForUser/);
});

test('airtime redemption requires a verified token-bound account', () => {
  const action = read('src/actions/airtime.ts');
  assert.match(action, /verifyRecyclerToken\(request\.idToken\)/);
  assert.match(action, /request\.userId && request\.userId !== userId/);
  assert.match(action, /Number\.isSafeInteger\(amount\)/);
});

test('user-controlled QR values cannot issue rewards', () => {
  const handler = read('src/app/dashboard/hooks/useRewardHandler.ts');
  assert.doesNotMatch(handler, /addPoints\s*\(/);
  assert.match(handler, /no Green Points have been credited/);
  const client = read('src/lib/firebase/firestore.ts');
  assert.doesNotMatch(client, /import\(['"]@\/actions\/greenpoints['"]\)/);
});

test('public machine registration fails closed', () => {
  const blockchain = read('src/actions/blockchain.ts');
  assert.match(blockchain, /verifyRecyclerToken\(idToken\)/);
  assert.match(blockchain, /Public RVM registration is disabled/);
});
