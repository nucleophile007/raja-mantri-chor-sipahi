import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ActivityIndicator, Text } from 'react-native';
import { colors } from './theme/colors';
import { RmcsSession } from './types/rmcs';
import { validateRmcsSession } from './lib/rmcsApi';
import RmcsHomeScreen from './screens/rmcs/RmcsHomeScreen';
import RmcsGameRoom from './screens/rmcs/RmcsGameRoom';

export default function RmcsApp({ onBackToArcade }: { onBackToArcade: () => void }) {
  const [session, setSession] = useState<RmcsSession | null>(null);
  const [checking, setChecking] = useState(false); // In a real app we'd check async storage

  if (checking) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{marginTop: 10, color: colors.text}}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <RmcsHomeScreen onSessionCreated={setSession} onBack={onBackToArcade} />;
  }

  return <RmcsGameRoom session={session} onLeave={() => { setSession(null); onBackToArcade(); }} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});
