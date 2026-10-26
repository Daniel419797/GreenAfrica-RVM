# Green Points on Base

Green Points are **non-transferable off-wallet** in-app reward units accounted for in the Green Africa Solidity contract on Base. They are not an ERC-20 or a cash-backed cryptoasset.

The authoritative state includes recycler hashed Green IDs, points balances, PET totals, deduplicated deposit session IDs, redemption IDs and audited operator changes. Firebase caches display data but cannot be trusted as proof of balances.

Source: `../base/contracts/GreenAfrica.sol`. Backend: `src/lib/base/client.ts`, `src/lib/base/server-points.ts`.

A real PET deposit must be verified by trusted hardware and a protected backend before Base ledger credit occurs. The user-supplied points query parameter must never mint points. The live machine-to-Base path remains incomplete and cannot be advertised as active.

The payment processor and reconciliation procedures must be tested before airtime redemption is enabled. See `base/README.md`.
