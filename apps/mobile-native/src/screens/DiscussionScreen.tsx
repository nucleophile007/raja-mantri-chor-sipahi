import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../theme/colors';
import { useGame } from '../context/GameContext';
import { API_BASE_URL } from '../lib/config';

interface DiscussionScreenProps {
  onNavigate?: (screen: string) => void;
}

export default function DiscussionScreen({ onNavigate }: DiscussionScreenProps) {
  const { gameState, updateGameState } = useGame();
  const [starting, setStarting] = useState(false);

  const handleStartVoting = async () => {
    if (!gameState.gameToken || !gameState.playerId) return;

    setStarting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/imposter/start-voting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-game-token': gameState.gameToken,
          'x-player-id': gameState.playerId,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.success) {
        updateGameState({ gameStatus: 'VOTING' });
        onNavigate?.('Voting');
      }
    } catch (error) {
      console.error('Error starting voting:', error);
    } finally {
      setStarting(false);
    }
  };

  const isHost = gameState.players.find((player) => player.isHost);
  const canStart = isHost?.name === gameState.playerName;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>💬 Discussion Time</Text>
          <Text style={styles.subtitle}>
            Talk and figure out who the imposter is!
          </Text>
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Rules:</Text>
          <Text style={styles.instructionText}>
            • Everyone knows the word except the IMPOSTER
          </Text>
          <Text style={styles.instructionText}>
            • The IMPOSTER must guess what the word is
          </Text>
          <Text style={styles.instructionText}>
            • Discuss and try to identify the IMPOSTER
          </Text>
          <Text style={styles.instructionText}>
            • Everyone casts a secret vote for who they think is the imposter
          </Text>
        </View>

        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>Players in Discussion</Text>
          <View style={styles.playersList}>
            {gameState.players.map((player, idx) => (
              <View key={idx} style={styles.playerCard}>
                <Text style={styles.playerName}>{player.name}</Text>
                {player.isHost && <Text style={styles.hostBadge}>HOST</Text>}
              </View>
            ))}
          </View>
        </View>

        {canStart && (
          <TouchableOpacity
            style={[styles.startButton, starting && styles.buttonDisabled]}
            onPress={handleStartVoting}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Start Voting →</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text,
  },
  instructionCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  playersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  playersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  hostBadge: {
    fontSize: 10,
    color: colors.accent,
    marginTop: 4,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: colors.success,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
