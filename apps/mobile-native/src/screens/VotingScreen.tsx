import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { useGame } from '../context/GameContext';
import { API_BASE_URL } from '../lib/config';

interface VotingScreenProps {
  onNavigate?: (screen: string) => void;
}

export default function VotingScreen({
  onNavigate,
}: VotingScreenProps) {
  const { gameState, updateGameState } = useGame();
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Quick fallback timer simulation if explicit pusher time isn't sent
  React.useEffect(() => {
    let timeout = (gameState as any).votingTimeout || 120;
    // Calculate if we have a startedAt
    if ((gameState as any).votingStartedAt) {
       const elapsed = Math.floor((Date.now() - new Date((gameState as any).votingStartedAt).valueOf()) / 1000);
       timeout = Math.max(0, timeout - elapsed);
    }
    setTimeLeft(timeout);
    
    const intv = setInterval(() => {
      setTimeLeft(prev => prev !== null && prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(intv);
  }, [(gameState as any).votingStartedAt, (gameState as any).votingTimeout]);

  const formatTimer = (s: number | null) => {
    if (s === null) return '0:00';
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return `${m}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleVote = async (targetName: string) => {
    if (hasVoted || voting) return;

    setVoting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/imposter/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-game-token': gameState.gameToken || '',
          'x-player-id': gameState.playerId || '',
        },
        body: JSON.stringify({ votedForName: targetName }),
      });

      const data = await response.json();
      if (data.success) {
        setHasVoted(true);
        updateGameState({
          voteCount: gameState.voteCount + 1,
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVoting(false);
    }
  };

  const voted = gameState.players.filter((p) => p.hasVoted).length;
  const total = gameState.players.length;
  const votingPercent = total > 0 ? Math.round((voted / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Main Wrapping Retro Box */}
        <View style={styles.mainWrapperBox}>

          {/* Header */}
          <Text style={styles.title}>🗳️ Secret Voting</Text>
          <Text style={styles.subtitle}>Cast your vote for the imposter</Text>

          {/* Progress */}
          <View style={styles.progressBox}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Votes Cast</Text>
              <Text style={styles.progressPercent}>{voted} / {total}</Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${votingPercent}%` },
                ]}
              />
            </View>
          </View>

          {/* Timer element */}
          {timeLeft !== null && (
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>[{formatTimer(timeLeft)}]</Text>
            </View>
          )}

          {/* Voting Box Status - NEVER HIDDEN */}
          <View style={styles.votingSection}>
            <Text style={styles.votingTitle}>Vote for the Imposter</Text>
            <View style={styles.playersGrid}>
              {gameState.players.map((player, idx) => {
                const isMe = player.name === gameState.playerName;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.voteButton,
                      (hasVoted || isMe) && styles.voteButtonDisabled,
                    ]}
                    onPress={() => handleVote(player.name)}
                    disabled={hasVoted || voting || isMe}
                  >
                    <View style={styles.voteRowLeft}>
                      {player.isHost ? <Text style={styles.voteIcon}>👑</Text> : <Text style={styles.voteIcon}>👤</Text>}
                      <Text style={styles.voteButtonText}>
                        {player.name} {isMe ? '(You)' : ''}
                      </Text>
                    </View>
                    {(player.hasVoted) && <Text style={styles.votedBadge}>✓ Voted</Text>}
                    {voting && !hasVoted && !isMe && <ActivityIndicator color="#001858" style={{marginLeft: 8}}/>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bottom Success Banner */}
          {hasVoted && (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>✓ You have voted! Waiting for others...</Text>
            </View>
          )}

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
    shadowOffset: { width: 4, height: 4 },
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
    backgroundColor: '#f582ae', // Pink progress fill
  },
  votingSection: {
    marginTop: 8,
  },
  votingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001858',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  timerBox: {
    backgroundColor: '#ffd803',
    paddingVertical: 12,
    borderWidth: 4,
    borderColor: '#001858',
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  voteButton: {
    backgroundColor: '#ffffff', // white retro buttons like web
    borderWidth: 3,
    borderColor: '#001858',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
  },
  voteRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  voteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001858',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  voteButtonDisabled: {
    backgroundColor: '#ffffff', // don't totally dim, just disable interaction
    opacity: 0.9,
  },
  votedBadge: {
    color: '#2ecc71',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBox: {
    backgroundColor: '#06ffa5', // neon green at bottom
    borderWidth: 4,
    borderColor: '#001858',
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});
