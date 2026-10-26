# Green Africa

Green Africa is a Nigeria-first recycling platform combining reverse vending machines (RVMs), verified PET recovery, Green Points and rewards. **The blockchain of record for new development is Base, an Ethereum L2.**

## Repositories and components

| Directory | Responsibility |
| --- | --- |
| `base/` | Solidity contract, local EVM tests, Base Sepolia deployment tooling |
| `rvm_api/` | Python / OpenCV machine-side detection and event interface |
| `rvm/` | Expo RVM operator/interface application |
| `webapp/` | Next.js / Firebase consumer dashboard and Base reward backend |
| `website/` | Public Astro marketing website |
| `legacy/algorand/` | Archived earlier contract, not used by current application |

## Recycling and rewards flow

1. A real RVM camera/sensor verifies the PET deposit.
2. The trusted backend authenticates and idempotently records the accepted deposit session.
3. The Base Solidity contract checks that the machine is active, rejects duplicate session IDs, and increases the recycler's Green Points and PET totals.
4. Firebase mirrors only user-facing data; Base is the ledger of record.
5. Rewards may be redeemed only after authenticated balance verification and an audited off-chain payout workflow.

**Important:** Stages 2 through 5 still need end-to-end production qualification. Until machine authentication, production AI, chain deployment and provider settlement are validated, no claims of live on-chain payouts are made. Random QR query parameters must not award points.

## Base configuration

Use Base Sepolia (`BASE_NETWORK=sepolia`, chain ID 84532) for local development. Mainnet (8453) is gated by explicit approval. Keys and deployment addresses are server-side only.

See `base/README.md`, `webapp/docs/BLOCKCHAIN_INTEGRATION.md` and `docs/LAGOS_PILOT_ACCEPTANCE.md` for exact setup and release gates.

## Status

- Solidity ledger: compiled and covered by local tests.
- Production machine PET classification: separate PR, real weights/validation pending.
- Recycler Android app: separate draft PR, integration pending.
- Pilot account/reward hardening: parent security PR.
- Base Sepolia contract: deployment pending, address not available.
- Mainnet: intentionally not deployed.
