import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticatedUid, mobileError } from '@/lib/mobile/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const uid = await authenticatedUid(request);
    const snapshot = await adminDb.collection('transactions').where('userId', '==', uid)
      .orderBy('date', 'desc').limit(40).get();
    const transactions = snapshot.docs.map(doc => {
      const tx = doc.data();
      return { id: doc.id, type: tx.type ?? 'earned', description: tx.description ?? 'Recycling activity',
        amount: Number(tx.amount) || 0, location: tx.location ?? null,
        date: tx.date?.toDate?.()?.toISOString?.() ?? null };
    });
    return Response.json({ transactions }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return mobileError(error); }
}
