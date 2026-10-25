import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Button, Empty, Heading, Page, Panel } from '@/src/components/UI';
import { api, ApiError } from '@/src/lib/api';
import { useSession } from '@/src/context/Session';
import type { Overview } from '@/src/lib/types';
import { C } from '@/src/lib/theme';

export default function Home() {
  const { user } = useSession();
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      let result: Overview;
      try {
        result = await api<Overview>('/me');
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 404) throw err;
        result = await api<Overview>('/me', {
          method: 'POST', body: { displayName: user.displayName || user.email?.split('@')[0] || 'Recycler' },
        });
      }
      setOverview(result); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load your account.'); }
    finally { setRefreshing(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} colors={[C.green]}/>}>
    <View style={s.top}>
      <View><Text style={s.greeting}>GOOD TO SEE YOU</Text><Text style={s.name}>Hello, {overview?.user.displayName?.split(' ')[0] || 'Recycler'}.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="View profile" style={s.avatar} onPress={() => router.push('/profile')}>
        <Ionicons name="person-outline" size={23} color={C.dark}/>
      </Pressable>
    </View>
    <Panel style={s.balanceCard}>
      <View style={s.balanceTop}><Text style={s.balanceLabel}>YOUR GREEN POINTS</Text><Ionicons name="leaf" color={C.accent} size={25}/></View>
      <Text style={s.balanceNumber}>{overview?.balance === null || overview?.balance === undefined ? '—' : overview.balance.toLocaleString()}</Text>
      <Text style={s.balanceUnit}>Points earned through verified recycling</Text>
      <View style={s.balanceDivider}/>
      <View style={s.cardFooter}><Text style={s.cardFooterText}>Powered by verified recycling</Text>
        <Ionicons name="shield-checkmark-outline" size={20} color={C.accent}/></View>
    </Panel>
    {overview?.balanceError ? <Text style={s.note}>{overview.balanceError}</Text> : null}
    {error ? <Empty title="Can't load your dashboard" description={error}/> : null}
    <Heading eyebrow="YOUR RECYCLING PASS" title="Your Green ID" description="Show your unique ID at a supported GreenAfrica recycling machine." />
    <Panel style={s.qrPanel}>
      {overview?.user.greenId ? <><View style={s.qr}><QRCode value={overview.user.greenId} size={160} color={C.darker} backgroundColor="#FFFFFF"/></View>
      <Text style={s.greenId}>{overview.user.greenId}</Text>
      <Text style={s.helper}>Only verified RVM deposits can earn points. This code alone cannot award rewards.</Text></> :
      <Text style={s.helper}>Sign in and connect to the backend to display your Green ID.</Text>}
    </Panel>
    <Heading eyebrow="MAKE AN IMPACT" title="Small actions. Real rewards."/>
    <View style={s.steps}>
      {[
        ['01', 'Find a recycling station', 'Locate a participating GreenAfrica RVM.'],
        ['02', 'Deposit PET bottles', 'The machine verifies each accepted bottle.'],
        ['03', 'Earn & redeem', 'Track Green Points and exchange them for airtime.'],
      ].map(([number, title, desc]) => <View key={number} style={s.step}>
        <Text style={s.stepNumber}>{number}</Text><View style={{ flex: 1 }}>
          <Text style={s.stepTitle}>{title}</Text><Text style={s.stepDesc}>{desc}</Text>
        </View>
      </View>)}
    </View>
    <Button title="Find a recycling station" onPress={() => router.push('/(tabs)/stations')}/>
  </Page>;
}
const s=StyleSheet.create({
  top:{ flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8},
  greeting:{fontSize:10,fontWeight:'900',letterSpacing:1.8,color:C.green},
  name:{fontSize:25,fontWeight:'900',color:C.text,marginTop:5},
  avatar:{width:46,height:46,borderRadius:16,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'},
  balanceCard:{backgroundColor:C.dark,borderColor:C.dark,padding:24,marginBottom:2},
  balanceTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  balanceLabel:{color:'#C9DFD2',fontWeight:'800',fontSize:11,letterSpacing:1.5},
  balanceNumber:{color:C.white,fontWeight:'900',fontSize:54,marginTop:12,letterSpacing:-2},
  balanceUnit:{color:'#B5D2C0',fontSize:13,marginTop:3},
  balanceDivider:{height:1,backgroundColor:'#356A4E',marginVertical:20},
  cardFooter:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  cardFooterText:{color:'#E2F0E5',fontSize:12},
  note:{color:C.muted,fontSize:12,marginTop:-3},
  qrPanel:{alignItems:'center',paddingVertical:26,gap:12},
  qr:{backgroundColor:C.white,padding:14,borderRadius:16},
  greenId:{color:C.text,fontWeight:'900',fontSize:17,letterSpacing:1},
  helper:{textAlign:'center',color:C.muted,fontSize:12,lineHeight:19,maxWidth:275},
  steps:{gap:11},
  step:{flexDirection:'row',gap:15,alignItems:'center',backgroundColor:C.white,padding:17,borderRadius:18},
  stepNumber:{fontSize:19,fontWeight:'900',color:C.green},
  stepTitle:{fontWeight:'800',color:C.text,fontSize:14},
  stepDesc:{color:C.muted,fontSize:12,marginTop:4,lineHeight:18},
});
