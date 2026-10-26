# Green Africa: Lagos Pilot Release Gate
Updated: 26 October 2026

## Status
**NOT ready for production.** This branch hardens rewards and identity boundaries; it does not deploy real PET models, RVM hardware, Base contracts, or pay airtime.

### Security controls introduced
1. Point minting, adjustment, burning and arbitrary ledger lookup were moved out of browser-callable Next.js Server Actions into `src/lib/base/server-points.ts`. The public points action is now an authenticated balance lookup only.
2. Airtime redemption verifies a Firebase ID token and derives the account UID from the token, rejecting mismatched client-supplied user IDs.
3. Recycler blockchain registration now requires a verified Firebase identity and matching Firestore profile; public RVM provisioning is disabled.
4. Reward QR query parameters cannot mint points. The UI shows pending verification instead.
5. Legacy browser flows that granted referral points, credited unverified machine rewards, or initiated unauthenticated redemption are disabled pending verified server replacements.

### Explicitly outstanding P0 release blockers
- Deploy and test strict Firestore security rules: authenticated users must not write `totalPoints`, `referralPoints`, `transactions`, `redemptions`, payment status or machine-reward confirmations. Admin SDK bypasses security rules; keep operator credentials server-side.
- Provide actual production-validated PET object/material models for PR #1. Until then, the motion-only detector may produce QR sessions but may not credit redeemable points.
- Complete a trusted backend RVM deposit acceptance endpoint using machine authentication, immutable evidence receipt, operator review, idempotency and Base confirmation.
- Deploy Base to Base Sepolia, configure the app ID/operator credentials, register actual pilot stations, then test accepted deposit, duplicate rejection, account balances and recovery from outages.
- Complete PR #2 mobile authentication, real station records and signed Android builds. **Integration note:** `webapp/src/app/api/mobile/redeem/route.ts` in PR #2 currently invokes `redeemAirtime` without the new `idToken`; pass the already-verified request bearer token to the action during integration.
- Validate the airtime provider response, reversal procedures and idempotent settlement. Current provider timeout / ambiguous-result handling is NOT production-ready: a timeout is not proof of non-delivery. Do not automatically refund ambiguous attempts.
- Verify Firestore cache and Base ledger reconciliation, double-submit scenarios, expired ID tokens, bad QR parameters, incorrect account IDs, replayed deposits and interrupted redemptions.
- Test real camera, actuator, bin-full switch, jam detection and fail-closed hardware behaviour on a pilot machine.
- Establish a clear privacy/consent and retention policy for recycler profiles and camera evidence.

### Staging acceptance checklist
- [ ] Invalid Firebase token cannot register a recycler or redeem airtime.
- [ ] A valid token for A cannot redeem against B's UID or view B's balance.
- [ ] A random URL `?code=X&points=1000000` credits 0 points.
- [ ] A non-PET item, image, old receipt or duplicate deposit credits 0 points.
- [ ] One physically accepted genuine PET item credits exactly once after a confirmed Base transaction.
- [ ] Each fulfilment attempt has a unique immutable ID; concurrent attempts and provider timeouts are reconciled rather than blindly retried.
- [ ] Machine offline / API offline / blockchain offline states visibly fail closed and recover without double credit.
- [ ] Firebase rules reject client writes to balances, ledger mirrors and payout status.
- [ ] Real Android phones can sign in, show verified balances and stations, and redeem one low-value test transaction end-to-end.

### Deployment rules
Do not merge/release security and mobile PRs blindly. Run CI, review privilege boundaries, test on staging using fake money and Base Sepolia first. Do not touch production Firestore, mint balances or pay an airtime provider during this release gate.
