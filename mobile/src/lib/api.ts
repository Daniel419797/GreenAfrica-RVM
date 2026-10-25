import { auth } from './firebase';

const origin = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function api<T>(path: string, options: {
  method?: 'GET' | 'POST'; body?: unknown; requestId?: string;
} = {}): Promise<T> {
  if (!origin || !/^https:\/\//.test(origin)) {
    throw new ApiError(0, 'Set EXPO_PUBLIC_API_URL to your HTTPS GreenAfrica backend.');
  }
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'Sign in to continue.');
  const token = await user.getIdToken();
  const response = await fetch(origin + '/api/mobile' + path, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      ...(options.requestId ? { 'X-Idempotency-Key': options.requestId } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
      ? data.error : data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
      ? data.message : 'Request failed. Please try again.';
    throw new ApiError(response.status, message);
  }
  return data as T;
}
