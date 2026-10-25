import React from 'react';
import { Redirect } from 'expo-router';
import { useSession } from '@/src/context/Session';
import { Loading } from '@/src/components/UI';

export default function Index() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  return <Redirect href={user ? '/(tabs)' : '/sign-in'} />;
}
