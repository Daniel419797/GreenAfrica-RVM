import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { authenticatedUid, mobileError } from '@/lib/mobile/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    await authenticatedUid(request);
    const result = await adminDb.collection('rvms').limit(100).get();
    const stations = result.docs.flatMap((doc) => {
      const data = doc.data();
      const location = data.location;
      const lat = typeof data.lat === 'number' ? data.lat :
        typeof location?.lat === 'number' ? location.lat : null;
      const lng = typeof data.lng === 'number' ? data.lng :
        typeof location?.lng === 'number' ? location.lng : null;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return [];
      return [{ id: doc.id, name: String(data.name ?? doc.id),
        address: String(data.address ?? ''), lat, lng,
        active: data.active === true, statusVerified: data.statusVerified === true }];
    });
    return Response.json({ stations }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return mobileError(error); }
}
