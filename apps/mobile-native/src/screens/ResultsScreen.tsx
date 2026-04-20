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

interface ResultsScreenProps {
  onNavigate?: (screen: string) => void;
}

export default function ResultsScreen({
  onNavigate,
}: ResultsScreenProps) {
  const { gameState, updateGameState } = useGame();
  const [restarting, setRestarting] = useState(false);

  const handleRestart = async () => {
    if (!gameState.gameToken) return;

    setRestarting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/imposter/restart`, {
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
        updateGameState({
          gameStatus: 'WAITING',
          myCard: null,
          voteCount: 0,
          myRole: null,
          result: {
            winner: null,
            imposterName: null,
            voteResults: [],
          },
        });
        onNavigate?.('Lobby');
      }
    } catch (error) {
      console.error('Error restarting:', error);
    } finally {
      setRestarting(false);
    }
  };

  const isWin = gameState.result.winner === 'PLAYERS_WIN';
  const imposterName = gameState.result.imposterName;
  const amIHost = gameState.players.find((p) => p.name === gameState.playerName)?.isHost;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Main Wrapping Retro Box like the Web UI */}
        <View style={styles.mainWrapperBox}>

          {/* Winner Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.resultIcon}>
              {isWin ? '🎉' : '🕵️'}
            </Text>
            <Text style={styles.resultTitle}>
              {isWin ? 'Players Win!' : 'Imposter Wins!'}
            </Text>
          </View>

          {/* Banner Box */}
          <View style={[
            styles.bannerBox,
            isWin ? { backgroundColor: '#06ffa5' } : { backgroundColor: '#ff1654' }
          ]}>
            <Text style={styles.bannerText}>
              {imposterName ? `${imposterName} was the imposter!` : 'Game Over!'}
            </Text>
            {imposterName && (
              <Text style={styles.bannerText}>
                The Imposter was: <Text style={styles.bannerBold}>{imposterName}</Text>
              </Text>
            )}
          </View>

          {/* Vote Results Box */}
          {gameState.result.voteResults.length > 0 && (
            <View style={styles.voteResultsBox}>
              <Text style={styles.voteResultsHeader}>Vote Results:</Text>
              {gameState.result.voteResults.map((result, idx) => (
                <View key={idx} style={styles.voteRow}>
                  <Text style={styles.voteName}>
                    {result.playerName} {result.isImposter && '🕵️'}
                  </Text>
                  <Text style={styles.voteCount}>
                    {result.voteCount} {result.voteCount === 1 ? 'vote' : 'votes'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Share Results Block */}
          <View style={styles.shareBox}>
            <Text style={styles.shareHeader}>📤 Share Results</Text>
            <View style={styles.shareRow}>
              <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#25D366' }]}>
                <Text style={styles.shareText}>💬 WHATSAPP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.shareButton, { backgroundColor: '#1DA1F2' }]}>
                <Text style={styles.shareText}>𝕏 SHARE</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Host Controls / Waiting Message */}
          {amIHost ? (
            <TouchableOpacity
              style={[styles.retroButton, { backgroundColor: colors.accent, marginTop: 8 }]}
              onPress={handleRestart}
              disabled={restarting}
            >
              {restarting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonText}>🔄 BACK TO LOBBY</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.retroButton,
                { marginTop: 8 },
                gameState.hostInLobby ? { backgroundColor: colors.accent } : { backgroundColor: '#808080' }
              ]}
              onPress={handleRestart}
              disabled={!gameState.hostInLobby || restarting}
            >
              {restarting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonText}>
                  {gameState.hostInLobby ? '🔄 RETURN TO LOBBY' : '⏳ WAITING FOR HOST...'}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Leave Game */}
          <TouchableOpacity style={[styles.retroButton, { backgroundColor: colors.secondary, marginTop: 16 }]}>
            <Text style={styles.buttonText}>🚪 LEAVE GAME</Text>
          </TouchableOpacity>

        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef6e4', // Warm retro background matching web
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
    padding: 16,
    // Native shadow for 8-bit retro look
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  resultIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  resultTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#001858',
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: -1,
  },
  bannerBox: {
    borderWidth: 4,
    borderColor: '#001858',
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  bannerText: {
    color: '#001858',
    fontSize: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  bannerBold: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  voteResultsBox: {
    borderWidth: 4,
    borderColor: '#001858',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 24,
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  voteResultsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001858',
    marginBottom: 16,
  },
  voteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#f1f1f1',
  },
  voteName: {
    fontSize: 16,
    color: '#001858',
  },
  voteCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001858',
  },
  shareBox: {
    borderWidth: 4,
    borderColor: '#001858',
    backgroundColor: '#ffd803', // Yellow like web
    padding: 16,
    marginBottom: 24,
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  shareHeader: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#001858',
    marginBottom: 12,
  },
  shareRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    borderWidth: 4,
    borderColor: '#001858',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginRight: 4,
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  shareText: {
    color: '#ffffff', // changed to white to match the contrast standard (like in image)
    fontWeight: 'bold',
    fontSize: 12,
    textShadowColor: '#001858',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  waitingBox: {
    borderWidth: 4,
    borderColor: '#001858',
    backgroundColor: '#ffd803',
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  waitingText: {
    fontSize: 14,
    color: '#001858',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  retroButton: {
    borderWidth: 4,
    borderColor: '#001858',
    padding: 16,
    alignItems: 'center',
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001858',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
