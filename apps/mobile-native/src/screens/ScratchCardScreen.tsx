import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import ScratchCard from '../components/ScratchCard';
import { useGame } from '../context/GameContext';
import { ImposterGameAction } from '../types/imposter';
import { API_BASE_URL } from '../lib/config';

interface ScratchCardScreenProps {
  onNavigate?: (screen: string) => void;
  onGameAction?: (action: ImposterGameAction) => void;
}

export default function ScratchCardScreen({
  onNavigate,
  onGameAction,
}: ScratchCardScreenProps) {
  const { gameState, updateGameState } = useGame();
  const [isScratching, setIsScratching] = useState(false);

  const handleScratchComplete = useCallback(async () => {
    setIsScratching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/imposter/scratch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-game-token': gameState.gameToken || '',
          'x-player-id': gameState.playerId || '',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.success) {
        updateGameState({ myCard: data.cardContent });
      }
    } catch (error) {
      console.error('Error scratching card:', error);
    } finally {
      setIsScratching(false);
    }
  }, [gameState.gameToken, gameState.playerId, updateGameState]);

  const scratched = gameState.players.filter((p) => p.hasScratched).length;
  const total = gameState.players.length;
  const scratchPercent = total > 0 ? Math.round((scratched / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={false}>
        
        {/* Main Wrapping Box */}
        <View style={styles.mainWrapperBox}>

          {/* Header */}
          <Text style={styles.title}>🎴 Scratch Card</Text>
          <Text style={styles.subtitle}>
            Reveal your secret identity
          </Text>

          {/* Progress Box */}
          <View style={styles.progressBox}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Players Ready</Text>
              <Text style={styles.progressPercent}>{scratched} / {total}</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${scratchPercent}%` },
                ]}
              />
            </View>
          </View>

          {/* Main scratch card */}
          <View style={styles.cardSection}>
            {isScratching && (
              <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.7)' }]}>
                <ActivityIndicator size="large" color="#001858" />
              </View>
            )}
            <View pointerEvents={isScratching ? 'none' : 'auto'}>
              <ScratchCard
                onComplete={handleScratchComplete}
                cardContent={gameState.myCard}
                isScratched={gameState.players.find(p => p.name === gameState.playerName)?.hasScratched || false}
              />
            </View>
          </View>

        </View>

        {/* Live player statuses Container */}
        <View style={styles.statusSectionBox}>
          <Text style={styles.statusTitle}>Live Status</Text>
          
          <View style={styles.playerGrid}>
            {gameState.players.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.playerBadge,
                  item.hasScratched && styles.playerScratched,
                ]}
              >
                <Text style={styles.playerName}>{item.name}</Text>
                {item.hasScratched ? (
                  <Text style={styles.playerStatus}>✅ Ready</Text>
                ) : (
                  <Text style={styles.playerStatus}>⏳ Scratching...</Text>
                )}
              </View>
            ))}
          </View>

        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef6e4',
  },
  content: {
    padding: 16,
    paddingTop: 40,
    paddingBottom: 40,
  },
  mainWrapperBox: {
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#001858',
    padding: 20,
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#001858',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: -1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    color: '#001858',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressBox: {
    borderWidth: 4,
    borderColor: '#001858',
    padding: 16,
    marginBottom: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#001858',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#001858',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#001858',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  progressBar: {
    height: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#001858',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8bd3dd', // light blue progress fill
  },
  cardSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statusSectionBox: {
    backgroundColor: '#ffd803', // yellow block 
    borderWidth: 4,
    borderColor: '#001858',
    padding: 20,
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001858',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  playerBadge: {
    width: '45%',
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#001858',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001858',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  playerScratched: {
    backgroundColor: '#06ffa5', // switch to green when ready
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#001858',
  },
  playerStatus: {
    fontSize: 12,
    color: '#001858',
    fontWeight: 'bold',
    marginTop: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
