'use server';

import { verifyRecyclerToken } from '@/lib/firebase/verified-user';
import { getUserPointsFromBlockchain, type GreenPointsResult } from '@/lib/algorand/server-points';

/**
 * The only browser-callable Green Points action is an authenticated, read-only
 * lookup. Deposits, refunds and deductions must use trusted server workflows.
 */
export async function getMyPointsFromBlockchain(idToken: string): Promise<GreenPointsResult> {
  const uid = await verifyRecyclerToken(idToken);
  if (!uid) return { success: false, error: 'Authentication required' };
  return getUserPointsFromBlockchain(uid);
}
