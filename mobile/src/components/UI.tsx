import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C } from '@/src/lib/theme';

export function Page({ children, refreshControl }: { children: React.ReactNode; refreshControl?: React.ReactElement<RefreshControlProps> }) {
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView showsVerticalScrollIndicator={false} refreshControl={refreshControl} contentContainerStyle={styles.page}>{children}</ScrollView>
  </SafeAreaView>;
}
export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}
export function Button({ title, onPress, secondary = false, disabled = false, loading = false }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; loading?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
    disabled={disabled || loading} style={[styles.button, secondary && styles.secondary, (disabled || loading) && styles.disabled]}>
    {loading ? <ActivityIndicator color={secondary ? C.dark : C.white} /> :
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{title}</Text>}
  </Pressable>;
}
export function Heading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <View style={{ marginBottom: 22 }}>
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
    <Text style={styles.heading}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
  </View>;
}
export function Empty({ title, description }: { title: string; description: string }) {
  return <Panel style={{ alignItems: 'center', paddingVertical: 30 }}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </Panel>;
}
export function Loading() {
  return <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
    <ActivityIndicator color={C.green} size="large" />
  </SafeAreaView>;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  page: { paddingHorizontal: 22, paddingBottom: 42, paddingTop: 20, gap: 16 },
  panel: { backgroundColor: C.white, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: C.line },
  button: { backgroundColor: C.dark, minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  buttonText: { color: C.white, fontWeight: '800', fontSize: 15 },
  secondary: { backgroundColor: C.accent },
  secondaryText: { color: C.dark },
  disabled: { opacity: 0.55 },
  eyebrow: { color: C.green, fontSize: 11, letterSpacing: 2, fontWeight: '800', marginBottom: 8 },
  heading: { fontSize: 30, fontWeight: '800', lineHeight: 36, color: C.text },
  description: { color: C.muted, fontSize: 14, lineHeight: 22, marginTop: 7 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 6, textAlign: 'center' },
});
