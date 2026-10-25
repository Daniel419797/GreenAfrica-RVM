import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { redeemAirtime } from '@/actions/airtime';
import { authenticatedUid, mobileError, MobileApiError } from '@/lib/mobile/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const uid = await authenticatedUid(request);
    const body: unknown = await request.json().catch(() => ({}));
    if (!body || typeof body !== 'object') throw new MobileApiError(400, 'Invalid request.');
    const fields = body as Record<string, unknown>;
    const amount = fields.amount;
    const phone = fields.phone;
    const network = fields.network;
    const requestId = request.headers.get('x-idempotency-key') ?? '';
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) {
      throw new MobileApiError(400, 'A unique request ID is required.');
    }
    if (!Number.isInteger(amount) || (amount as number) < 50 || (amount as number) > 5000 ||
        typeof phone !== 'string' || !/^[+0-9 ]{10,18}$/.test(phone) ||
        typeof network !== 'string' || !['MTN','GLO','AIRTEL','9MOBILE','NTEL'].includes(network.toUpperCase())) {
      throw new MobileApiError(400, 'Check the phone, network and amount (₦50–₦5,000).');
    }
    // Atomic create stops retries or concurrent requests from double-fulfilling airtime.
    // Leave interrupted requests pending for administrative reconciliation, not blind retries.
    const marker = adminDb.collection('mobileRedemptionAttempts').doc(uid + '_' + requestId);
    try {
      await marker.create({ userId: uid, amount, phone, network, status: 'processing',
        createdAt: new Date() });
    } catch {
      throw new MobileApiError(409, 'This redemption request was already submitted. Check your activity before trying again.');
    }
    try {
      const result = await redeemAirtime({ userId: uid, amount: amount as number,
        phone: phone as string, network: network as string });
      await marker.update({ status: result.success ? 'completed' : 'failed',
        redemptionId: result.redemptionId ?? null, updatedAt: new Date() });
      return Response.json({ success: result.success, message: result.message,
        redemptionId: result.redemptionId ?? null }, { status: result.success ? 200 : 422 });
    } catch (error) {
      await marker.update({ status: 'needs_review', updatedAt: new Date() }).catch(() => {});
      throw error;
    }
  } catch (error) { return mobileError(error); }
}
