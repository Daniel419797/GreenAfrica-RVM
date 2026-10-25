import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { api } from '@/src/lib/api';
import type { Overview } from '@/src/lib/types';

type Session = {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const SessionContext = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (next) => { setUser(next); setLoading(false); }), []);
  const value = useMemo<Session>(() => ({
    user, loading,
    login: async (email, password) => {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    },
    register: async (name, email, password) => {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      try {
        await api<Overview>('/me', { method: 'POST', body: { displayName: name.trim() } });
      } catch (error) {
        // Preserve the authenticated identity for safe retry; never silently fabricate a profile.
        console.warn('GreenAfrica profile registration needs retry', error);
        throw error;
      }
    },
    logout: async () => { await signOut(auth); },
  }), [user, loading]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('SessionProvider is missing');
  return session;
}
