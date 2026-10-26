import { getAuth } from 'firebase-admin/auth';
import firebaseAdminApp from '@/lib/firebase/admin';

/**
 * Verify Firebase identity on the server; never trust a browser-supplied UID.
 * Admin initialization/credentials must succeed or the operation fails closed.
 */
export async function verifyRecyclerToken(idToken: unknown): Promise<string | null> {
  if (typeof idToken !== 'string' || idToken.length < 100 || idToken.length > 8192) {
    return null;
  }
  try {
    const decoded = await getAuth(firebaseAdminApp).verifyIdToken(idToken, true);
    return typeof decoded.uid === 'string' && decoded.uid.length > 0 ? decoded.uid : null;
  } catch {
    return null;
  }
}
