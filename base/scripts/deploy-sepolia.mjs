import { readFileSync, writeFileSync } from 'node:fs';
import { createPublicClient, createWalletClient, http, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

if (!process.argv.includes('--broadcast') || process.env.BASE_DEPLOY_CONFIRM !== 'base-sepolia') {
  console.log('Dry run: deployment disabled by default. To broadcast, pass --broadcast with BASE_DEPLOY_CONFIRM=base-sepolia and a funded testnet account.');
  process.exit(0);
}

const privateKey = process.env.BASE_OPERATOR_PRIVATE_KEY;
if (!privateKey || !/^0x[a-f\d]{64}$/i.test(privateKey)) throw new Error('Valid BASE_OPERATOR_PRIVATE_KEY required on the server.');
const rpc = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
const account = privateKeyToAccount(privateKey);
const client = createPublicClient({ chain: baseSepolia, transport: http(rpc) });
const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(rpc) });
if (await client.getChainId() !== 84532) throw new Error('Refusing to deploy on anything except Base Sepolia (84532)');
const artifact = JSON.parse(readFileSync(new URL('../artifacts/GreenAfrica.json', import.meta.url), 'utf8'));
const tx = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [] });
const receipt = await client.waitForTransactionReceipt({ hash: tx, confirmations: 2, timeout: 120_000 });
if (receipt.status !== 'success' || !receipt.contractAddress || !isAddress(receipt.contractAddress)) {
  throw new Error('Base Sepolia deployment not confirmed');
}
console.log('Base Sepolia GreenAfrica deployed at ' + receipt.contractAddress);
console.log('Transaction ' + tx);
writeFileSync(new URL('../artifacts/base-sepolia-deployment.json', import.meta.url), JSON.stringify({
  chainId: 84532,
  contractAddress: receipt.contractAddress,
  transactionHash: tx,
  deployedAt: new Date().toISOString(),
}, null, 2));
