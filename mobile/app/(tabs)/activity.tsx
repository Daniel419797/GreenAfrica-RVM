import React, { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Empty, Heading, Page, Panel } from '@/src/components/UI';
import { api } from '@/src/lib/api';
import type { Activity } from '@/src/lib/types';
import { C } from '@/src/lib/theme';

export default function ActivityScreen() {
  const [transactions, setTransactions] = useState<Activity[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load=useCallback(async()=>{
    setRefreshing(true);
    try { const result=await api<{transactions:Activity[]}>('/activity'); setTransactions(result.transactions); setError('');}
    catch(e){setError(e instanceof Error?e.message:'Unable to load activity');}
    finally{setRefreshing(false);}
  },[]);
  useFocusEffect(useCallback(()=>{void load();},[load]));
  return <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void load()} colors={[C.green]}/>}>
    <Heading eyebrow="YOUR JOURNEY" title="Every bottle counts." description="See your verified recycling rewards and redemptions in one place."/>
    <Panel style={s.hero}><Ionicons name="receipt-outline" size={28} color={C.accent}/>
      <Text style={s.heroTitle}>{transactions.length} recent activities</Text>
      <Text style={s.heroCaption}>The latest transactions attached to your recycler account.</Text></Panel>
    {error ? <Empty title="Activity unavailable" description={error}/> : null}
    {!error && transactions.length===0?<Empty title="Your journey starts here" description="Verified recycling deposits and rewards will appear here once your first transaction is recorded."/>:null}
    {transactions.map((item)=><Panel key={item.id} style={s.row}>
      <View style={[s.icon,{backgroundColor:item.type==='redeemed'?C.paleGold:C.pale}]}>
        <Ionicons name={item.type==='redeemed'?'gift-outline':'leaf-outline'} size={21} color={C.green}/></View>
      <View style={{flex:1}}><Text style={s.title}>{item.description}</Text>
        <Text style={s.date}>{item.date?new Date(item.date).toLocaleDateString():'Date pending'} {item.location?'· '+item.location:''}</Text></View>
      <Text style={[s.amount,{color:item.type==='redeemed'?C.danger:C.green}]}>{item.type==='redeemed'?'-':'+'}{Math.abs(item.amount)} pts</Text>
    </Panel>)}
  </Page>;
}
const s=StyleSheet.create({
  hero:{backgroundColor:C.dark,borderColor:C.dark,gap:9},
  heroTitle:{fontSize:22,fontWeight:'900',color:C.white},
  heroCaption:{color:'#B9D5C3',fontSize:12},
  row:{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:16,paddingHorizontal:13},
  icon:{width:44,height:44,borderRadius:15,alignItems:'center',justifyContent:'center'},
  title:{fontWeight:'800',fontSize:13,color:C.text},date:{fontSize:11,color:C.muted,marginTop:5},
  amount:{fontSize:12,fontWeight:'900'},
});
