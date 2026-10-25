import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Heading, Page, Panel } from '@/src/components/UI';
import { useSession } from '@/src/context/Session';
import { api } from '@/src/lib/api';
import type { Overview } from '@/src/lib/types';
import { C } from '@/src/lib/theme';

export default function Profile() {
  const { user, logout } = useSession(); const router=useRouter();
  const [profile,setProfile]=useState<Overview|null>(null);
  const [error,setError]=useState('');const [refreshing,setRefreshing]=useState(false);
  const load=useCallback(async()=>{
    setRefreshing(true);try{setProfile(await api<Overview>('/me'));setError('');}
    catch(e){setError(e instanceof Error?e.message:'Unable to load profile');}finally{setRefreshing(false);}
  },[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  return <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void load()} colors={[C.green]}/>}>
    <Pressable style={s.back} onPress={()=>router.back()} accessibilityLabel="Go back">
      <Ionicons name="arrow-back" size={23} color={C.text}/></Pressable>
    <Heading eyebrow="YOUR ACCOUNT" title="Recycling with purpose." />
    <Panel style={s.hero}><View style={s.avatar}><Ionicons name="person" size={32} color={C.dark}/></View>
      <Text style={s.name}>{profile?.user.displayName||'Recycler'}</Text>
      <Text style={s.email}>{profile?.user.email||user?.email||''}</Text></Panel>
    <Panel style={{gap:18}}>
      <Item label="GreenAfrica ID" value={profile?.user.greenId||'Not available'}/>
      <View style={s.line}/>
      <Item label="Referral code" value={profile?.user.referralCode||'Not available'}/>
      <View style={s.line}/>
      <Item label="Registered email" value={profile?.user.email||user?.email||'Not available'}/>
    </Panel>
    {error?<Text style={s.error}>{error}</Text>:null}
    <Button title="Sign out" secondary onPress={()=>{void logout().then(()=>router.replace('/sign-in'));}}/>
    <Text style={s.footer}>GreenAfrica · Making recycling rewarding</Text>
  </Page>;
}
function Item({label,value}:{label:string;value:string}) {
  return <View><Text style={s.label}>{label}</Text><Text selectable style={s.value}>{value}</Text></View>;
}
const s=StyleSheet.create({
  back:{width:40,height:40,justifyContent:'center'},
  hero:{alignItems:'center',gap:8,paddingVertical:28},
  avatar:{width:75,height:75,borderRadius:25,backgroundColor:C.pale,alignItems:'center',justifyContent:'center',marginBottom:8},
  name:{fontSize:21,fontWeight:'900',color:C.text},
  email:{fontSize:13,color:C.muted},
  line:{height:1,backgroundColor:C.line},
  label:{fontSize:12,color:C.muted},
  value:{fontSize:15,fontWeight:'800',color:C.text,marginTop:5},
  error:{color:C.danger,fontSize:13},
  footer:{textAlign:'center',fontSize:11,color:C.muted},
});
