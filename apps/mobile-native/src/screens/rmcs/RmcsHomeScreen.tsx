import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, PanResponder } from 'react-native';
import { colors } from '../../theme/colors';
import { createRmcsGame, joinRmcsGame } from '../../lib/rmcsApi';
import { RmcsSession } from '../../types/rmcs';

type FlowState = 'select' | 'host' | 'join';

export default function RmcsHomeScreen({ onSessionCreated, onBack }: { onSessionCreated: (session: RmcsSession) => void, onBack: () => void }) {
  const [flow, setFlow] = useState<FlowState>('select');
  const [playerName, setPlayerName] = useState('');
  const [gameToken, setGameToken] = useState('');
  const [maxRounds, setMaxRounds] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const trackWidthRef = useRef<number>(0);
  const initialRoundsRef = useRef<number>(5);
  const currentRoundsRef = useRef<number>(maxRounds);
  currentRoundsRef.current = maxRounds;

  // Custom Pan Responder for standard dragging interaction
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Save the latest rounds securely bypassing the stale closure hook
        initialRoundsRef.current = currentRoundsRef.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (trackWidthRef.current === 0) return;
        const deltaRounds = (gestureState.dx / trackWidthRef.current) * 15;
        const newRounds = Math.max(1, Math.min(15, Math.round(initialRoundsRef.current + deltaRounds)));
        setMaxRounds(newRounds);
      }
    })
  ).current;

  const handleHost = async () => {
    if (!playerName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const session = await createRmcsGame(playerName.trim(), maxRounds);
      onSessionCreated(session);
    } catch (err: any) {
      setError(err.message || 'Error creating game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!playerName.trim() || !gameToken.trim()) return;
    setLoading(true);
    setError('');
    try {
      const session = await joinRmcsGame(playerName.trim(), gameToken.trim().toUpperCase());
      onSessionCreated(session);
    } catch (err: any) {
      setError(err.message || 'Error joining game');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (flow !== 'select') {
      setFlow('select');
      setError('');
    } else {
      onBack();
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.pixelCard}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← BACK</Text>
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.titleIcon}>👑</Text>
              <Text style={styles.title}>RMCS</Text>
            </View>
            <View style={{ width: 80 }} /> 
          </View>

          {error ? <Text style={styles.errorText}>❌ {error}</Text> : null}

          {flow === 'select' && (
            <View style={styles.selectFlow}>
              <Text style={styles.description}>
                The classic Indian card game with roles: Raja, Mantri, Chor, Sipahi!
              </Text>
              
              <TouchableOpacity onPress={() => setFlow('host')} style={[styles.mainButton, { backgroundColor: colors.success }]}>
                <Text style={styles.mainButtonText}>🎯 HOST NEW GAME</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setFlow('join')} style={[styles.mainButton, { backgroundColor: colors.secondary }]}>
                <Text style={styles.mainButtonText}>👋 JOIN GAME</Text>
              </TouchableOpacity>
            </View>
          )}

          {flow === 'host' && (
            <View style={styles.formFlow}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Enter your name"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
              
              <Text style={styles.label}>Number of Rounds: {maxRounds}</Text>
              <View style={styles.sliderContainer}>
                 <TouchableOpacity onPress={() => setMaxRounds(Math.max(1, maxRounds - 1))} style={styles.sliderBtn}>
                   <Text style={styles.sliderBtnText}>-</Text>
                 </TouchableOpacity>
                 <View 
                    style={styles.sliderTrack} 
                    onLayout={(e) => trackWidthRef.current = e.nativeEvent.layout.width}
                    {...panResponder.panHandlers}
                 >
                    <View style={[styles.sliderFill, { width: `${(maxRounds / 15) * 100}%` }]} />
                    <View style={styles.sliderThumb} />
                 </View>
                 <TouchableOpacity onPress={() => setMaxRounds(Math.min(15, maxRounds + 1))} style={styles.sliderBtn}>
                   <Text style={styles.sliderBtnText}>+</Text>
                 </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleHost} disabled={loading || !playerName.trim()} style={[styles.mainButton, { backgroundColor: colors.success, opacity: loading || !playerName.trim() ? 0.6 : 1 }]}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.mainButtonText}>🎮 CREATE GAME</Text>}
              </TouchableOpacity>
            </View>
          )}

          {flow === 'join' && (
            <View style={styles.formFlow}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Enter your name"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />

              <Text style={styles.label}>Game Code</Text>
              <TextInput
                value={gameToken}
                onChangeText={setGameToken}
                placeholder="Enter code"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                style={[styles.input, styles.tokenInput]}
              />

              <TouchableOpacity onPress={handleJoin} disabled={loading || !playerName.trim() || !gameToken.trim()} style={[styles.mainButton, { backgroundColor: colors.secondary, opacity: loading || !playerName.trim() || !gameToken.trim() ? 0.6 : 1 }]}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={[styles.mainButtonText, { color: colors.text }]}>👋 JOIN GAME</Text>}
              </TouchableOpacity>
            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { padding: 20, paddingTop: 40, alignItems: 'center' },
  pixelCard: {
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.border,
    padding: 24,
    width: '100%',
    maxWidth: 600,
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: 100,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 14,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    fontSize: 24,
  },
  title: {
    color: colors.border,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  description: {
    color: colors.border,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  selectFlow: {
    width: '100%',
    gap: 16,
  },
  mainButton: {
    width: '100%',
    borderWidth: 4,
    borderColor: colors.border,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  mainButtonText: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 16,
  },
  formFlow: {
    width: '100%',
  },
  label: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 4,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: colors.border,
    marginBottom: 24,
  },
  tokenInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 4,
    fontWeight: 'bold',
  },
  errorText: {
    color: colors.danger,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 10,
  },
  sliderBtn: {
    borderWidth: 3,
    borderColor: colors.border,
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderBtnText: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 18,
  },
  sliderTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#555',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#f97316', // orange thumb track
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f97316',
    borderWidth: 2,
    borderColor: colors.surface,
    marginLeft: -10,
  }
});
