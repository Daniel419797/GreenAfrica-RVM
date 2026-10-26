# Green Africa Blockchain Integration: Base

Green Africa has migrated its intended accounting layer from Algorand to **Base**. Green Points are non-transferable in-app rewards, not an ERC-20 token. Recyclers use Firebase and a Green ID and do not need wallets.

- Solidity contract: `base/contracts/GreenAfrica.sol`
- Build and local EVM tests: `base/scripts/compile.mjs` and `base/tests/GreenAfrica.test.mjs`
- Backend client: `src/lib/base/client.ts`
- Internal reward accounting: `src/lib/base/server-points.ts`
- Public balance action: `src/actions/greenpoints.ts`, which verifies Firebase identity.

Only the trusted server-side operator can send Base transactions, and only a governance owner can register RVMs or adjust balances. Machine-accepted PET sessions are hashed and checked for duplicate IDs on-chain. Phone numbers, emails and raw camera recordings remain off-chain.

Set `BASE_NETWORK=sepolia`, `BASE_RPC_URL=https://sepolia.base.org`, `BASE_GREENAFRICA_CONTRACT_ADDRESS` and the server-only `BASE_OPERATOR_PRIVATE_KEY`. Never use client-exposed variables for secrets.

Base Mainnet must not be enabled until review, confirmed deployments, machine tests and reconciliation are complete. Testnet is chain ID 84532. See `base/README.md` and `docs/LAGOS_PILOT_ACCEPTANCE.md`.

**Deployment status: not deployed.** The old Algorand system is archived, not used by the active backend.
