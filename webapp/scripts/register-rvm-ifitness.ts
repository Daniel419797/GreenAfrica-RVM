#!/usr/bin/env tsx
/** Explicit governance-only RVM registration for the Lagos pilot on Base. */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { registerRVMOnBlockchain } from '../src/lib/base/client';

const ID = 'RVM-IFITNESS-ORCHID-001';
async function main() {
  if (process.argv.includes('--confirm') === false) {
    console.log('Dry-run only: machine', ID);
    console.log('Base Sepolia requires --confirm and server-only Base governance credentials.');
    return;
  }
  if ((process.env.BASE_NETWORK || 'sepolia') !== 'sepolia') {
    throw new Error('Pilot machine provisioning is restricted to Base Sepolia');
  }
  const result = await registerRVMOnBlockchain(ID);
  if (!result.success) throw new Error(result.error || 'RVM registration failed');
  console.log('Base Sepolia RVM transaction:', result.transactionId);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
