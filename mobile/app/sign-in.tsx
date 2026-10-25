import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/src/components/UI';
import { useSession } from '@/src/context/Session';
import { C } from '@/src/lib/theme';

export default function SignIn() {
  const { user, loading, login, register } = useSession();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  if (user && !working && !loading) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    setError('');
    if (!email.includes('@') || password.length < 6 || (creating && name.trim().length < 2)) {
      setError('Enter a valid email, password (6+ characters), and your name.');
      return;
    }
    setWorking(true);
    try {
      if (creating) await register(name, email, password);
      else await login(email, password);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const code = (e as { code?: string }).code;
      setError(code === 'auth/email-already-in-use' ? 'That email is registered. Sign in instead.'
        : code === 'auth/invalid-credential' ? 'Incorrect email or password.'
        : e instanceof Error ? e.message : 'Unable to sign in.');
    } finally { setWorking(false); }
  };
  return <SafeAreaView style={s.safe}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.content}>
      <View style={s.brand}><Ionicons name="leaf" size={24} color={C.accent}/><Text style={s.brandText}>greenafrica</Text></View>
      <View style={s.hero}><View style={s.circle}><Ionicons name="leaf-outline" size={55} color={C.accent}/></View>
        <Text style={s.title}>Turn bottles into better tomorrows.</Text>
        <Text style={s.subtitle}>Recycle smarter. Earn Green Points. Make every bottle count.</Text>
      </View>
      <View style={s.form}>
        <Text style={s.formTitle}>{creating ? 'Create your account' : 'Welcome back'}</Text>
        {creating ? <TextInput placeholder="Full name" value={name} onChangeText={setName} style={s.input} autoCapitalize="words" accessibilityLabel="Full name"/> : null}
        <TextInput placeholder="Email address" value={email} onChangeText={setEmail} style={s.input} autoCapitalize="none" keyboardType="email-address" autoComplete="email" accessibilityLabel="Email address"/>
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={s.input} secureTextEntry autoComplete={creating ? 'new-password' : 'current-password'} accessibilityLabel="Password"/>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Button title={creating ? 'Join GreenAfrica' : 'Sign in'} onPress={submit} loading={working} />
        <Pressable onPress={() => { setCreating(!creating); setError(''); }} style={s.switch}>
          <Text style={s.switchText}>{creating ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  content: { flex: 1, paddingHorizontal: 26, paddingVertical: 14, justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 20, fontWeight: '900', color: C.dark, letterSpacing: -1 },
  hero: { marginTop: 16, paddingVertical: 18 },
  circle: { height: 106, width: 106, backgroundColor: C.dark, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 22, transform: [{ rotate: '-7deg' }] },
  title: { fontSize: 38, fontWeight: '900', color: C.dark, lineHeight: 44, letterSpacing: -1.3 },
  subtitle: { color: C.muted, fontSize: 15, lineHeight: 24, marginTop: 10 },
  form: { gap: 12, paddingBottom: 20 },
  formTitle: { fontSize: 21, fontWeight: '800', color: C.text, marginBottom: 4 },
  input: { backgroundColor: C.white, borderRadius: 16, paddingHorizontal: 17, minHeight: 55, fontSize: 15, borderWidth: 1, borderColor: C.line, color: C.text },
  error: { color: C.danger, fontSize: 13 },
  switch: { alignItems: 'center', padding: 8 },
  switchText: { fontSize: 14, color: C.green, fontWeight: '700' },
});
