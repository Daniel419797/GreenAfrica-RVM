import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ethers } from 'ethers';
import ganache from 'ganache';

const artifact = JSON.parse(readFileSync(new URL('../artifacts/GreenAfrica.json', import.meta.url), 'utf8'));
const hash = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));

test('Green Africa Base ledger enforces operator permissions and idempotency', async () => {
  const local = ganache.provider({
    logging: { quiet: true },
    chain: { hardfork: 'shanghai', chainId: 1337 },
    wallet: { totalAccounts: 3 },
  });
  const provider = new ethers.BrowserProvider(local);
  const owner = await provider.getSigner(0);
  const stranger = await provider.getSigner(1);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, owner);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  const send = async (method, ...args) => (await contract[method](...args)).wait();
  const expectRevert = async (fn) => assert.rejects(async () => { const tx = await fn(); await tx.wait(); });

  const recycler = hash('GRN-2026-000001');
  const station = hash('RVM-LAGOS-001');
  const session = hash('session-deposit-one');
  const redemption = hash('redemption-one');

  assert.equal(await contract.isRecyclerRegistered(recycler), false);
  await expectRevert(() => contract.connect(stranger).registerRecycler(recycler));
  await expectRevert(() => contract.connect(stranger).registerRvm(station));
  await send('registerRecycler', recycler);
  await send('registerRvm', station);
  assert.equal(await contract.isRvmActive(station), true);

  await send('recordDeposit', recycler, station, 2n, 20n, session, hash('evidence'));
  assert.deepEqual([...(await contract.getRecycler(recycler))], [20n, 2n]);
  assert.equal(await contract.isSessionRecorded(session), true);
  await expectRevert(() => contract.recordDeposit(recycler, station, 2n, 20n, session, hash('evidence')));
  await expectRevert(() => contract.recordDeposit(recycler, station, 0n, 20n, hash('invalid'), hash('evidence')));

  await send('setRvmActive', station, false);
  await expectRevert(() => contract.recordDeposit(recycler, station, 1n, 1n, hash('inactive'), hash('evidence')));
  await send('setRvmActive', station, true);

  await expectRevert(() => contract.redeemPoints(recycler, 21n, hash('too-big'), hash('phone')));
  await send('redeemPoints', recycler, 10n, redemption, hash('airtime:phone'));
  assert.deepEqual([...(await contract.getRecycler(recycler))], [10n, 2n]);
  await expectRevert(() => contract.redeemPoints(recycler, 10n, redemption, hash('airtime:phone')));

  const adjustment = hash('approved-refund-one');
  await expectRevert(() => contract.connect(stranger).adjustPoints(recycler, 5n, true, adjustment, hash('refund:case-1')));
  await send('adjustPoints', recycler, 5n, true, adjustment, hash('refund:case-1'));
  assert.deepEqual([...(await contract.getRecycler(recycler))], [15n, 2n]);
  await expectRevert(() => contract.adjustPoints(recycler, 5n, true, adjustment, hash('refund:case-1')));
  await assert.rejects(() => contract.getRecycler(hash('unknown')));
});
