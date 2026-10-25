import { randomBytes } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import firebaseAdminApp from '@/lib/firebase/admin';
import { registerUserOnAlgorand } from '@/actions/blockchain';
import { getUserPointsFromBlockchain } from '@/actions/greenpoints';
import { authenticatedUid, mobileError, MobileApiError } from '@/lib/mobile/server';

export const runtime = 'nodejs';

async function view(uid: string) {
  const snapshot = await adminDb.collection('users').doc(uid).get();
  if (!snapshot.exists) throw new MobileApiError(404, 'Complete your recycler profile to continue.');
  const user = snapshot.data()!;
  const balance = await getUserPointsFromBlockchain(uid);
  return {
    user: { uid, displayName: user.displayName ?? 'Recycler', greenId: user.greenId,
      email: user.email ?? '', phoneNumber: user.phoneNumber ?? '', referralCode: user.referralCode ?? '' },
    balance: balance.success && balance.balance !== undefined ? Number(balance.balance) : null,
    balanceSource: 'algorand',
    balanceError: balance.success ? null : 'Live Green Points balance is currently unavailable.',
  };
}

export async function GET(request: NextRequest) {
  try {
    const uid = await authenticatedUid(request);
    return Response.json(await view(uid), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return mobileError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await authenticatedUid(request);
    const body: unknown = await request.json().catch(() => ({}));
    const name = typeof body === 'object' && body !== null && 'displayName' in body
      && typeof body.displayName === 'string' ? body.displayName.trim() : '';
    if (name.length < 2 || name.length > 70) throw new MobileApiError(400, 'Enter your name (2–70 characters).');
    const record = await getAuth(firebaseAdminApp).getUser(uid);
    const docRef = adminDb.collection('users').doc(uid);
    let doc = await docRef.get();
    if (!doc.exists) {
      const suffix = randomBytes(7).toString('hex').toUpperCase();
      try {
        await docRef.create({ uid, email: record.email ?? '', displayName: name,
          phoneNumber: record.phoneNumber ?? '', greenId: 'GRN-' + suffix,
          referralCode: 'GA' + randomBytes(5).toString('hex').toUpperCase(),
          totalPoints: 0, referralPoints: 0, createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp() });
      } catch (error) {
        // Concurrent initial requests may race; never overwrite existing account state.
        doc = await docRef.get();
        if (!doc.exists) throw error;
      }
    }
    const profile = (await docRef.get()).data()!;
    // Registration is safe to retry; the Algorand adapter checks for an existing recycler.
    // Failure does not fabricate an on-chain balance.
    const registration = await registerUserOnAlgorand(profile.greenId, profile.referralCode);
    const current = await view(uid);
    return Response.json({ ...current, blockchainRegistered: registration.success,
      registrationMessage: registration.success ? null : 'Blockchain registration pending. Rewards cannot be used until it succeeds.' });
  } catch (error) { return mobileError(error); }
}
