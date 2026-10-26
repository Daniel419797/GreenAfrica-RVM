# Green Africa on Base (Ethereum L2)

**Current status:** contract and local test coverage only. Not deployed to Base Sepolia or Mainnet.

- **Development:** Base Sepolia (chain ID `84532`), public RPC `https://sepolia.base.org`
- **Production:** Base Mainnet (chain ID `8453`). Disabled in Green Africa's backend without `BASE_ALLOW_MAINNET=true`.
- **Green Points:** internal, non-transferable accounting, not a crypto token or ERC-20. Users need no wallet.
- **Identifiers:** Green ID, RVM ID, session ID, redemption ID and destination proof are Keccak-256 hashed to `bytes32` before recording on-chain. Never store phone numbers, public QR codes or user PII on-chain.

## Build and local tests

```bash
cd base
npm ci
npm test
```

This compiles `contracts/GreenAfrica.sol` with `solc` and runs a local Ganache EVM scenario to verify permission boundaries, station activation, recycling deposit accounting, duplicate rejection, redemption balances, and audited adjustments.

## Deployment (Base Sepolia only)

```bash
cd base
npm run deploy:sepolia
```

The deploy script is a safe dry-run by default. Broadcasting additionally requires `BASE_DEPLOY_CONFIRM=base-sepolia`, `BASE_OPERATOR_PRIVATE_KEY` (on the server only) and an explicit `--broadcast` flag. Deploy only after funding a dedicated testnet account with faucet ETH and reviewing the source. Never put private keys in GitHub, code, screenshots, client-side variables or chat messages.

```bash
BASE_DEPLOY_CONFIRM=base-sepolia npm run deploy:sepolia -- --broadcast
```

The deployer initially owns the contract and is an operator. For a controlled pilot, move ownership to governance and authorize a limited-scope service operator. Adjustments are owner-only; the event includes an immutable adjustment ID and reason hash.

Contract address, transaction hash and chain ID are printed only after a confirmed transaction. **No address is published until deployment and verification actually succeed.**

## Backend environment

```dotenv
BASE_NETWORK=sepolia
BASE_RPC_URL=https://sepolia.base.org
BASE_GREENAFRICA_CONTRACT_ADDRESS=
BASE_OPERATOR_PRIVATE_KEY=
GREENAFRICA_ENABLE_LIVE_REDEMPTION=false
```

The backend verifies that RPC chain ID matches the configured network and contract bytecode exists before signing. Private keys must remain on a protected server, ideally behind KMS and a transaction policy.

## Still required for a real Lagos pilot

1. Production PET material validation and machine-actuator feedback.
2. Trusted machine-signed/idempotent deposit submission API; **browser QR fields cannot mint points**.
3. Testnet deployed contract and real registered machines.
4. Firestore server-side mutation restrictions and balance reconciliation.
5. Separate processor for airtime with uncertain-provider-result reconciliation, no unconditional timeout refunds.
6. Merge mobile app only once its authenticated redemption route is updated to transmit Firebase ID token.
7. Solidity security review, rate limits, fraud monitoring and business/financial compliance.

Legacy Algorand source is archived under `legacy/algorand`; the old automated deployment workflow has been removed.
