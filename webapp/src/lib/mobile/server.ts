import { getAuth } from 'firebase-admin/auth';
import type { NextRequest } from 'next/server';
import firebaseAdminApp from '@/lib/firebase/admin';

export class MobileApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function authenticatedUid(request: NextRequest): Promise<string> {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ') || authorization.length < 20) {
    throw new MobileApiError(401, 'Sign in to continue.');
  }
  try {
    const decoded = await getAuth(firebaseAdminApp).verifyIdToken(authorization.slice(7), true);
    return decoded.uid;
  } catch {
    throw new MobileApiError(401, 'Session expired. Please sign in again.');
  }
}

export function mobileError(error: unknown): Response {
  if (error instanceof MobileApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error('[mobile API]', error);
  return Response.json({ error: 'Service temporarily unavailable. Please try again.' }, { status: 503 });
}
