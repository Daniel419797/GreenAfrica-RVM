import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Button, Heading, Page, Panel } from '@/src/components/UI';
import { api } from '@/src/lib/api';
import { C } from '@/src/lib/theme';
import type { Overview } from '@/src/lib/types';
import { validNigerianPhone, validRedeemAmount } from '@/src/lib/validation';

const networks=['MTN','GLO','AIRTEL','9MOBILE'] as const;
export default function Rewards(){
  const [balance,setBalance]=useState<number|null>(null);
  const [amount,setAmount]=useState('100');
  const [phone,setPhone]=useState('');
  const [network,setNetwork]=useState<string>('MTN');
  const [loading,setLoading]=useState(false);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    setRefreshing(true);
    try{const data=await api<Overview>('/me');setBalance(data.balance);setError('');}
    catch(e){setBalance(null);setError(e instanceof Error?e.message:'Unable to retrieve balance');}
    finally{setRefreshing(false);}
  },[]);
  useFocusEffect(useCallback(()=>{void refresh();},[refresh]));
  const numeric=Number(amount);
  const canRedeem=validRedeemAmount(numeric,balance)&&validNigerianPhone(phone)&&!loading;
  const submit=()=>{
    if(!canRedeem)return;
    Alert.alert('Confirm airtime redemption',
      'Redeem '+numeric+' Green Points for ₦'+numeric+' airtime on '+network+' to '+phone+'?',
      [{text:'Cancel',style:'cancel'}, {text:'Confirm',onPress:()=>{
        void (async()=>{
          setLoading(true);setError('');
          try{
            const requestId='red_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,13);
            const data=await api<{success:boolean;message:string}>('/redeem',
              {method:'POST',requestId,body:{amount:numeric,phone,network}});
            Alert.alert(data.success?'Redemption submitted':'Redemption unsuccessful',data.message);
            await refresh();
          }catch(e){setError(e instanceof Error?e.message:'Redemption failed.');}
          finally{setLoading(false);}
        })();
      }}]);
  };
  return <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void refresh()} colors={[C.green]}/>}>
    <Heading eyebrow="GREEN REWARDS" title="Good deeds, real value." description="Turn verified Green Points into airtime for your phone."/>
    <Panel style={s.hero}><Ionicons name="gift" size={30} color={C.accent}/>
      <Text style={s.heroCaption}>AVAILABLE GREEN POINTS</Text>
      <Text style={s.heroAmount}>{balance===null?'Unavailable':balance.toLocaleString()}</Text>
      <Text style={s.heroBottom}>Balance verified from Algorand. 1 point = ₦1 airtime.</Text></Panel>
    <Panel style={{gap:15}}>
      <Text style={s.section}>Redeem airtime</Text>
      <Text style={s.label}>Select mobile network</Text>
      <View style={s.networks}>{networks.map(n=><Pressable key={n} onPress={()=>setNetwork(n)}
        style={[s.network,network===n&&s.networkSelected]}>
        <Text style={[s.networkText,network===n&&s.networkTextSelected]}>{n}</Text></Pressable>)}</View>
      <Text style={s.label}>Phone number</Text>
      <TextInput accessibilityLabel="Recipient phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone}
        placeholder="08012345678" style={s.input} maxLength={18}/>
      <Text style={s.label}>Airtime amount (₦)</Text>
      <View style={s.amounts}>{[50,100,200,500].map(n=><Pressable key={n} style={[s.amountBox,numeric===n&&s.amountSelected]}
        onPress={()=>setAmount(String(n))}><Text style={[s.amountText,numeric===n&&s.amountTextSelected]}>₦{n}</Text></Pressable>)}</View>
      <TextInput accessibilityLabel="Custom amount" keyboardType="number-pad" value={amount}
        onChangeText={setAmount} style={s.input} placeholder="50 - 5000"/>
      <Text style={s.help}>Minimum ₦50, maximum ₦5,000. Redemption is disabled if the verified balance is unavailable.</Text>
      {error?<Text style={s.error}>{error}</Text>:null}
      <Button title="Redeem airtime" disabled={!canRedeem} loading={loading} onPress={submit}/>
    </Panel>
    <Panel style={s.coming}><Ionicons name="cellular-outline" size={25} color={C.green}/>
      <View style={{flex:1}}><Text style={s.section}>Data bundles</Text>
        <Text style={s.help}>Coming soon. Data fulfilment is not yet implemented in the existing backend.</Text></View></Panel>
  </Page>;
}
const s=StyleSheet.create({
  hero:{backgroundColor:C.dark,borderColor:C.dark,gap:8},
  heroCaption:{fontSize:11,color:'#BCD9C4',fontWeight:'800',letterSpacing:1.2},
  heroAmount:{fontSize:42,fontWeight:'900',color:C.white},
  heroBottom:{color:'#C3D8C8',fontSize:12,lineHeight:19},
  section:{fontSize:18,fontWeight:'900',color:C.text},
  label:{fontSize:12,fontWeight:'800',color:C.text,marginBottom:-6},
  networks:{flexDirection:'row',flexWrap:'wrap',gap:8},
  network:{backgroundColor:C.background,paddingHorizontal:13,paddingVertical:13,borderRadius:13},
  networkSelected:{backgroundColor:C.dark},
  networkText:{fontSize:12,fontWeight:'800',color:C.text},
  networkTextSelected:{color:C.white},
  input:{borderRadius:14,borderWidth:1,borderColor:C.line,paddingHorizontal:15,height:53,fontSize:15,color:C.text},
  amounts:{flexDirection:'row',gap:7},
  amountBox:{flex:1,paddingVertical:13,alignItems:'center',borderRadius:13,backgroundColor:C.background},
  amountSelected:{backgroundColor:C.accent},
  amountText:{fontSize:12,fontWeight:'800',color:C.text},
  amountTextSelected:{color:C.dark},
  help:{fontSize:12,color:C.muted,lineHeight:19},
  error:{fontSize:12,color:C.danger},
  coming:{flexDirection:'row',gap:13,alignItems:'center'},
});
