# GreenAfrica Recycler Mobile

Android-first Expo / React Native client for the existing GreenAfrica recycling platform.
This is **not** the technician-facing Expo app in `/rvm`; this app is for people
depositing PET bottles at GreenAfrica reverse-vending machines.

## What works in this source release

- Firebase email/password authentication, native persistent login.
- Recycler onboarding through an authenticated Next.js API and Firestore.
- Green ID display and QR rendering; QR is an identity marker, not proof of deposit.
- Green Points balance fetched from **Algorand** (never locally minted).
- Verified activity records from the server, not a demo transaction list.
- RVM station directory from the `rvms` Firestore collection and map directions.
- Airtime redemption using the existing GreenAfrica server-side pipeline, with bearer-ID-token authorization, server-side amount/network validation and request idempotency.
- Android bundling and TypeScript validation.

## Setup

1. `cd mobile && npm ci`
2. Copy `.env.example` to `.env`, then populate your **public Firebase client configuration** and the **HTTPS URL of the GreenAfrica Next.js webapp**. Do not enter Firebase Admin credentials or Algorand operator keys here.
3. In the same Firebase project, enable **Email/Password** sign-in if it is not already enabled.
4. Configure and deploy the existing Next.js backend from `webapp/` with its **server-side** Firebase Admin and Algorand credentials. Ensure the required Algorand contract is actually deployed and accessible.
5. Start with `npm start` (Expo Go) or produce an Android build using EAS with your own Expo account and app-signing credentials.

```sh
cd mobile
npm ci
npm run typecheck
npm test
npx expo export --platform android
```

### Backend mobile routes

All routes are under `webapp/src/app/api/mobile` and require a verified Firebase ID
token from `Authorization: Bearer <token>`.

| Path | Method | Purpose |
| --- | --- | --- |
| /api/mobile/me | GET | Recycler profile + live Algorand points |
| /api/mobile/me | POST | Idempotent profile creation and Algorand registration attempt |
| /api/mobile/stations | GET | Registered station location listing |
| /api/mobile/activity | GET | User-scoped activity timeline |
| /api/mobile/redeem | POST | Airtime redemption with 16-80 character X-Idempotency-Key |

The redemption request marker is created atomically in `mobileRedemptionAttempts`.
Interrupted requests are **not automatically replayed** because replaying could spend
points twice. Investigate unresolved markers and provider-side fulfilment before
reconciliation. The provider API and Algorand TestNet need real end-to-end testing.

### Station metadata

Add station documents to Firestore `rvms` with `name`, `address`, `lat`, `lng`,
`active` and `statusVerified`. Unverified status is shown honestly; no pilot
location is fabricated. Machine availability and camera verification remain
responsibilities of the RVM/edge/backend systems.

## Not production-complete yet

- No Firebase/Algorand production credentials were copied into this folder or used in development.
- Neither a physical reverse vending machine nor a fulfilment provider was used in tests.
- Live Firebase rules, backend deployment, Algorand contract state, end-to-end redemption
  and physical RVM/QR pairing need acceptance testing.
- Data-bundle redemption is intentionally marked "Coming soon" until the backend
  implements it. No fake data purchase button.
- Existing website Google/Facebook/phone login providers are not yet implemented natively;
  existing OAuth-only users need provider integration before the public launch.
- No signed APK/AAB has been generated or published; `expo export` creates a JS bundle,
  not an installable Android app.

## Security

- Never use a direct client-side `mintPoints` or `adjustPoints` call.
- Only accept machine-verified recycling events on the trusted RVM backend.
- Authenticate and authorize the RVM backend separately from recycler users.
- Do not embed server-side `FIREBASE_PRIVATE_KEY`, `TERMII_API_KEY` or
  `GREENAFRICA_OPERATOR_MNEMONIC` inside Expo `EXPO_PUBLIC_*` variables.
- Before production, verify Firestore security rules, rate limiting, redemption
  reconciliation, audit trails, and abuse detection.

## Repository structure

`mobile/`: recycler app; `rvm/`: technician app; `webapp/`: server/API
and recycler web dashboard; `rvm_api/`: machine verification; `algorand/`: ledger.
