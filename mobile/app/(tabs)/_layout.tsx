import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/src/lib/theme';
import { useSession } from '@/src/context/Session';
import { Loading } from '@/src/components/UI';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline', stations: 'location-outline',
  activity: 'time-outline', rewards: 'gift-outline',
};
export default function TabsLayout() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/sign-in" />;
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: C.green, tabBarInactiveTintColor: C.muted,
    tabBarStyle: { height: 72, paddingBottom: 12, paddingTop: 7, borderTopWidth: 0,
      backgroundColor: C.white, elevation: 8 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse-outline'} size={size} color={color}/>,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} />
    <Tabs.Screen name="stations" options={{ title: 'Stations' }} />
    <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
    <Tabs.Screen name="rewards" options={{ title: 'Rewards' }} />
  </Tabs>;
}
