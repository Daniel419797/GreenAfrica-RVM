import { createPublicClient, createWalletClient, http, isAddress, keccak256, parseAbi, stringToHex, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

export interface BlockchainResult {
  success: boolean;
  transactionId?: string;
  userExists?: boolean;
  error?: string;
}
export interface RecyclerState {
  points: bigint;
  totalPet: bigint;
}

const abi = parseAbi([
  'function operators(address operator) view returns (bool)',
  'function owner() view returns (address)',
  'function isRecyclerRegistered(bytes32 recyclerId) view returns (bool)',
  'function registerRecycler(bytes32 recyclerId)',
  'function registerRvm(bytes32 rvmId)',
  'function isRvmActive(bytes32 rvmId) view returns (bool)',
  'function setRvmActive(bytes32 rvmId, bool active)',
  'function recordDeposit(bytes32 recyclerId, bytes32 rvmId, uint64 petCount, uint64 pointsAwarded, bytes32 sessionId, bytes32 receiptHash)',
  'function isSessionRecorded(bytes32 sessionId) view returns (bool)',
  'function redeemPoints(bytes32 recyclerId, uint64 pointsToRedeem, bytes32 redemptionId, bytes32 destinationHash)',
  'function adjustPoints(bytes32 recyclerId, uint64 amount, bool add, bytes32 adjustmentId, bytes32 reasonHash)',
  'function getRecycler(bytes32 recyclerId) view returns (uint64 points, uint64 totalPet)',
]);

const hashId = (text: string): Hex => {
  if (!text || !text.trim()) throw new Error('Non-empty identifier required');
  return keccak256(stringToHex(text.trim()));
};
const validAmount = (value: number) => Number.isSafeInteger(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER;

function network() {
  const selected = (process.env.BASE_NETWORK || 'sepolia').toLowerCase();
  if (selected === 'sepolia') return baseSepolia;
  if (selected === 'mainnet' && process.env.BASE_ALLOW_MAINNET === 'true') return base;
  throw new Error('Unsupported Base network (Mainnet requires explicit operator approval)');
}

async function context() {
  const chain = network();
  const rpc = process.env.BASE_RPC_URL || (chain.id === 84532 ? 'https://sepolia.base.org' : 'https://mainnet.base.org');
  const address = process.env.BASE_GREENAFRICA_CONTRACT_ADDRESS;
  if (!address || !isAddress(address)) throw new Error('BASE_GREENAFRICA_CONTRACT_ADDRESS is not configured');
  const publicClient = createPublicClient({ chain, transport: http(rpc, { timeout: 20_000 }) });
  if (await publicClient.getChainId() !== chain.id) throw new Error('Base RPC chain ID mismatch');
  const code = await publicClient.getCode({ address: address as Address });
  if (!code || code === '0x') throw new Error('GreenAfrica contract not deployed at configured address');
  return { chain, address: address as Address, publicClient, rpc };
}

async function signedContext() {
  const ctx = await context();
  const secret = process.env.BASE_OPERATOR_PRIVATE_KEY;
  if (!secret || !/^0x[a-fA-F0-9]{64}$/.test(secret)) throw new Error('BASE_OPERATOR_PRIVATE_KEY not configured');
  const account = privateKeyToAccount(secret as Hex);
  const wallet = createWalletClient({ account, chain: ctx.chain, transport: http(ctx.rpc, { timeout: 20_000 }) });
  return { ...ctx, wallet, account };
}

async function write(functionName: 'registerRecycler' | 'registerRvm' | 'recordDeposit' | 'redeemPoints' | 'adjustPoints', args: readonly unknown[], requiresOwner = false): Promise<BlockchainResult> {
  try {
    const ctx = await signedContext();
    const isOwner = (await ctx.publicClient.readContract({ address: ctx.address, abi, functionName: 'owner' })).toLowerCase() === ctx.account.address.toLowerCase();
    if (requiresOwner && !isOwner) throw new Error('Only the governance owner can perform this operation');
    if (!requiresOwner) {
      const isOperator = await ctx.publicClient.readContract({ address: ctx.address, abi, functionName: 'operators', args: [ctx.account.address] });
      if (!isOperator) throw new Error('Configured signer is not an authorised Base operator');
    }
    // A single internal dispatcher handles all writes. EVM ABI simulation rejects
    // invalid amounts, insufficient balances, unauthorised callers and replay.
    const invocation = { address: ctx.address, abi, functionName, args, account: ctx.account } as Parameters<typeof ctx.publicClient.simulateContract>[0];
    const simulation = await ctx.publicClient.simulateContract(invocation);
    const hash = await ctx.wallet.writeContract(simulation.request);
    const receipt = await ctx.publicClient.waitForTransactionReceipt({ hash, confirmations: 2, timeout: 120_000 });
    if (receipt.status !== 'success') throw new Error('Base transaction reverted');
    return { success: true, transactionId: hash };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Base transaction failed' };
  }
}

export async function registerUserOnBlockchain(greenId: string): Promise<BlockchainResult> {
  try {
    if (await checkUserExists(greenId)) return { success: true, userExists: true };
    return await write('registerRecycler', [hashId(greenId)]);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Base registration failed' };
  }
}

export async function checkUserExists(greenId: string): Promise<boolean> {
  const ctx = await context();
  return ctx.publicClient.readContract({ address: ctx.address, abi, functionName: 'isRecyclerRegistered', args: [hashId(greenId)] });
}

export async function registerRVMOnBlockchain(rvmId: string): Promise<BlockchainResult> {
  return write('registerRvm', [hashId(rvmId)], true);
}

export async function recordDepositOnBase(
  recyclerId: string, rvmId: string, petCount: number, pointsAwarded: number, receiptPayload: string, sessionId: string,
): Promise<BlockchainResult> {
  if (!validAmount(petCount) || !validAmount(pointsAwarded) || !receiptPayload) return { success: false, error: 'Invalid deposit values' };
  return write('recordDeposit', [hashId(recyclerId), hashId(rvmId), BigInt(petCount), BigInt(pointsAwarded), hashId(sessionId), hashId(receiptPayload)]);
}

export async function redeemPointsOnBase(
  recyclerId: string, points: number, rewardType: string, destination: string, redemptionId: string,
): Promise<BlockchainResult> {
  if (!validAmount(points) || !rewardType || !destination) return { success: false, error: 'Invalid redemption values' };
  return write('redeemPoints', [hashId(recyclerId), BigInt(points), hashId(redemptionId), hashId(rewardType + ':' + destination)]);
}

export async function adjustPointsOnBase(
  recyclerId: string, points: number, add: boolean, adjustmentId: string, reason: string,
): Promise<BlockchainResult> {
  if (!validAmount(points) || !adjustmentId || !reason) return { success: false, error: 'A unique audited adjustment ID and reason are required' };
  return write('adjustPoints', [hashId(recyclerId), BigInt(points), add, hashId(adjustmentId), hashId(reason)], true);
}

export async function getRecyclerOnBase(greenId: string): Promise<RecyclerState | null> {
  const ctx = await context();
  const id = hashId(greenId);
  const registered = await ctx.publicClient.readContract({ address: ctx.address, abi, functionName: 'isRecyclerRegistered', args: [id] });
  if (!registered) return null;
  const [points, totalPet] = await ctx.publicClient.readContract({ address: ctx.address, abi, functionName: 'getRecycler', args: [id] });
  return { points, totalPet };
}

export async function isBlockchainConfigured(): Promise<boolean> {
  return Boolean(process.env.BASE_GREENAFRICA_CONTRACT_ADDRESS && process.env.BASE_OPERATOR_PRIVATE_KEY);
}
