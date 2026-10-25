import React, { useCallback, useState } from 'react';
import { Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Button, Empty, Heading, Page, Panel } from '@/src/components/UI';
import { api } from '@/src/lib/api';
import type { Station } from '@/src/lib/types';
import { C } from '@/src/lib/theme';

export default function Stations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await api<{ stations: Station[] }>('/stations');
      setStations(response.stations); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load stations.'); }
    finally { setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <Page refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} colors={[C.green]}/>}>
    <Heading eyebrow="DROP-OFF LOCATIONS" title="Find your next stop." description="Explore registered GreenAfrica reverse vending machines. Availability is only shown when confirmed."/>
    <Panel style={{ backgroundColor:C.pale, borderColor:C.pale, flexDirection:'row',alignItems:'center',gap:14 }}>
      <Ionicons name="location-outline" size={28} color={C.green}/>
      <View style={{ flex:1 }}><Text style={s.infoTitle}>Recycling made local</Text>
        <Text style={s.infoDesc}>Bring empty PET bottles to a participating machine and follow its deposit instructions.</Text></View>
    </Panel>
    {error ? <Empty title="Couldn't load stations" description={error}/> : null}
    {!error && stations.length === 0 ? <Empty title="Stations are being prepared"
      description="No location has been published in the station registry yet. We won't display made-up addresses."/> : null}
    {stations.map((station) => <Panel key={station.id} style={{ gap:14 }}>
      <View style={{ flexDirection:'row',justifyContent:'space-between',alignItems:'center' }}>
        <View style={s.pin}><Ionicons name="leaf-outline" color={C.dark} size={25}/></View>
        <Text style={[s.status, {color:station.statusVerified && station.active ? C.green : C.muted}]}>
          {station.statusVerified ? station.active ? 'Registered active' : 'Currently inactive' : 'Availability unverified'}
        </Text>
      </View>
      <View><Text style={s.stationName}>{station.name}</Text>
        <Text style={s.address}>{station.address || 'Address pending confirmation'}</Text></View>
      <Button title="Directions" secondary onPress={() => void Linking.openURL('https://www.google.com/maps/search/?api=1&query='+
        encodeURIComponent(station.lat+','+station.lng))}/>
    </Panel>)}
  </Page>;
}
const s=StyleSheet.create({
  infoTitle:{color:C.dark,fontSize:15,fontWeight:'800'},
  infoDesc:{color:C.muted,fontSize:12,marginTop:5,lineHeight:18},
  pin:{width:50,height:50,borderRadius:16,backgroundColor:C.pale,alignItems:'center',justifyContent:'center'},
  status:{fontSize:11,fontWeight:'800'},
  stationName:{fontSize:20,fontWeight:'900',color:C.text},
  address:{fontSize:13,color:C.muted,marginTop:6,lineHeight:19},
});
