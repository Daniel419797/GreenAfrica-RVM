# Base Sepolia RVM registration

Machine registration is **owner-only** in `base/contracts/GreenAfrica.sol`. The public Next.js Server Action rejects all RVM registration attempts.

After successful Base Sepolia testnet deployment, set server-only `BASE_NETWORK=sepolia`, `BASE_RPC_URL`, `BASE_GREENAFRICA_CONTRACT_ADDRESS`, and `BASE_OPERATOR_PRIVATE_KEY`. The signer must be the contract owner and have faucet test ETH.

For an intentionally registered pilot machine, use:

```bash
cd webapp
npm run register-rvm -- --confirm
```

The script defaults to dry-run without `--confirm` and rejects Mainnet provisioning.

Machine display name, location and camera data remain in Firebase. On-chain station ID is a one-way keccak hash. No machine IDs or contract deployments are confirmed until BaseSepolia transactions are independently verified.
