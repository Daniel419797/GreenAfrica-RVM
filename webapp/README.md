# Green Africa Web Application

Next.js and Firebase interface for Green Africa. The backend now targets **Base Sepolia** (Ethereum L2) for non-transferable Green Points accounting.

## Local development
```bash
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

## Blockchain
- Contract: `../base/contracts/GreenAfrica.sol`.
- Server client: `src/lib/base/client.ts`.
- Server ledger workflow: `src/lib/base/server-points.ts`.
- Firebase: recycler identity, UI caching and transactions.
- Base: authoritative PET deposits and Green Points accounting.
- Backend env: `BASE_NETWORK=sepolia`, `BASE_RPC_URL=https://sepolia.base.org`, `BASE_GREENAFRICA_CONTRACT_ADDRESS`, `BASE_OPERATOR_PRIVATE_KEY`.
- `GREENAFRICA_ENABLE_LIVE_REDEMPTION` defaults to disabled. No real airtime may be redeemed until tested with the actual provider and manual-reconciliation controls.

Users do not need crypto wallets. Server-held private keys must never reach browsers or repository files. Base Mainnet is disabled by default.

## Security status
The draft security PR disables award of points from untrusted QR URLs. RVM intake must eventually use machine attestation, rate limiting and anti-replay proof before production. Referrals and prior unverified redemption paths are fail-closed until replaced by authenticated server workflows.

Read `docs/BLOCKCHAIN_INTEGRATION.md`, `../base/README.md`, and `../docs/LAGOS_PILOT_ACCEPTANCE.md` for more detail.
