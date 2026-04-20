import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
  RefreshControl,
} from 'react-native';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../lib/config';
import { useGame } from '../context/GameContext';
import { getImposterState, leaveImposterGame } from '../lib/imposterApi';
import { clearSession } from '../lib/session';

export default function LobbyScreen() {
  const { gameState, updateGameState } = useGame();
  const [refreshing, setRefreshing] = useState(false);
  const [startingGame, setStartingGame] = useState(false);
  const [pollError, setPollError] = useState('');
  const [timeoutLabel, setTimeoutLabel] = useState('2 minutes');

  // Poll for game state updates
  useEffect(() => {
    let pollAttempts = 0;
    const interval = setInterval(async () => {
      if (!gameState.gameToken || !gameState.playerId) return;
      try {
        const response = await getImposterState({
          gameToken: gameState.gameToken,
          playerId: gameState.playerId,
        });

        if (response.success && response.gameState) {
          pollAttempts = 0;
          setPollError('');
          const players = (response.gameState.players || []).map((p: any) => ({
            name: p.name,
            hasScratched: p.hasScratched,
            hasVoted: p.hasVoted,
            isHost: p.isHost,
            isInLobby: p.isInLobby,
          }));
          updateGameState({
            gameStatus: (response.gameState.gameStatus as any) || gameState.gameStatus,
            players,
          });
        }
      } catch (err) {
        pollAttempts++;
        if (pollAttempts > 5) {
          setPollError('Lost connection to game');
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [gameState.gameToken, gameState.playerId, updateGameState]);

  const handleRefresh = useCallback(async () => {
    if (refreshing || !gameState.gameToken || !gameState.playerId) return;
    setRefreshing(true);
    setPollError('');
    try {
      const response = await getImposterState({
        gameToken: gameState.gameToken,
        playerId: gameState.playerId,
      });

      if (response.success && response.gameState) {
        const players = (response.gameState.players || []).map((p: any) => ({
          name: p.name,
          hasScratched: p.hasScratched,
          hasVoted: p.hasVoted,
          isHost: p.isHost,
          isInLobby: p.isInLobby,
        }));
        updateGameState({
          gameStatus: (response.gameState.gameStatus as any) || gameState.gameStatus,
          players,
        });
      }
    } catch (err) {
      setPollError('Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }, [gameState.gameToken, gameState.playerId, refreshing, updateGameState]);

  const handleStartGame = useCallback(async () => {
    if (gameState.players.length < 3) return;

    setStartingGame(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/imposter/start`, {
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
        updateGameState({ gameStatus: data.gameStatus || 'CARDS_DEALT' });
      } else {
        Alert.alert('Error', data.error || 'Could not start game');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error');
    } finally {
      setStartingGame(false);
    }
  }, [gameState.gameToken, gameState.playerId, gameState.players.length, updateGameState]);

  const handleLeaveLobby = useCallback(() => {
    Alert.alert('Leave game?', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            if (gameState.gameToken && gameState.playerId) {
              await leaveImposterGame({ gameToken: gameState.gameToken, playerId: gameState.playerId });
            }
          } catch (err) {}
          await clearSession();
          updateGameState({
            gameToken: null,
            playerId: null,
            playerName: null,
            gameStatus: null,
            players: [],
          });
        },
      },
    ]);
  }, [gameState.gameToken, gameState.playerId, updateGameState]);

  const changeTimeout = () => {
    Alert.alert('Set Voting Timeout', 'Choose the voting phase length', [
      { text: '1 minute', onPress: () => setTimeoutLabel('1 minute') },
      { text: '2 minutes', onPress: () => setTimeoutLabel('2 minutes') },
      { text: '3 minutes', onPress: () => setTimeoutLabel('3 minutes') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my game of Raja Mantri Chor Sipahi! Code: ${gameState.gameToken}`,
      });
    } catch (error) {}
  };

  const isHost = gameState.players.find((p) => p.isHost)?.name === gameState.playerName;
  const playersInLobby = gameState.players.filter(p => p.isInLobby !== false);
  const canStart = isHost && playersInLobby.length >= 3;

  return (
    <View style={styles.root}>
      {/* Navbar Container */}
      <View style={styles.navBar}>
        <View style={styles.navBarLeft}>
          <Text style={styles.navBarTitle}>🕵️ Imposter</Text>
          <View style={styles.navBarSubtitleRow}>
            <Text style={styles.navBarLabel}>Code: </Text>
            <Text style={styles.navBarCode}>{gameState.gameToken}</Text>
            <View style={styles.dotOnline} />
          </View>
        </View>
        <View style={styles.navBarRight}>
          <TouchableOpacity style={[styles.navButton, { backgroundColor: '#f582ae' }]} onPress={handleRefresh}>
            <Text>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, { backgroundColor: '#ff1654' }]} onPress={handleLeaveLobby}>
            <Text>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Main Wrapper Box */}
        <View style={styles.mainWrapperBox}>
          
          <Text style={styles.wrapperTitle}>Waiting for Players ({playersInLobby.length}/20)</Text>
          <Text style={styles.wrapperSubtitle}>Need at least 3 players to start</Text>

          {/* Players Grid */}
          <View style={styles.playerGrid}>
            {playersInLobby.map((player, idx) => {
              const isMe = player.name === gameState.playerName;
              
              return (
                <View key={idx} style={styles.playerCard}>
                  {player.isHost && <Text style={styles.playerIcon}>👑</Text>}
                  {!player.isHost && <Text style={styles.playerIcon}>👤</Text>}
                  <Text style={styles.playerNameText}>
                    {player.name} {isMe ? '(You)' : ''}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Host Setup Panel */}
          {isHost && (
            <View style={styles.hostPanel}>
              <Text style={styles.hostPanelLabel}>⏱️ Voting Timeout</Text>
              <TouchableOpacity style={styles.dropdownBox} onPress={changeTimeout}>
                <Text style={styles.dropdownText}>{timeoutLabel}</Text>
                <Text style={styles.dropdownText}>v</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Start / Wait Button */}
          {isHost ? (
            <TouchableOpacity
              style={[
                styles.retroButton,
                canStart ? { backgroundColor: '#06ffa5' } : { backgroundColor: '#808080' },
              ]}
              onPress={handleStartGame}
              disabled={!canStart || startingGame}
            >
              {startingGame ? (
                <ActivityIndicator color="#001858" />
              ) : (
                <Text style={styles.buttonText}>
                  {canStart ? 'START GAME' : `NEED ${Math.max(0, 3 - playersInLobby.length)} MORE PLAYERS`}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={[styles.retroButton, { backgroundColor: '#ffd803' }]}>
              <Text style={styles.buttonText}>WAITING FOR HOST...</Text>
            </View>
          )}
        </View>

        {/* Invite Box Wrapper */}
        <View style={styles.inviteWrapperBox}>
          <Text style={styles.inviteTitle}>📩 Invite Players</Text>
          
          <View style={styles.codeSuperBox}>
            <Text style={styles.hugeCodeText}>
              {gameState.gameToken?.split('').join(' ')}
            </Text>
          </View>

          <View style={styles.shareRow}>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#25D366' }]} onPress={handleShare}>
              <Text style={styles.shareBtnIcon}>💬</Text>
              <Text style={styles.shareBtnText}>WHATSAPP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#1DA1F2' }]} onPress={handleShare}>
              <Text style={styles.shareBtnIcon}>𝕏</Text>
              <Text style={styles.shareBtnText}>SHARE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.shareBtn, { backgroundColor: '#f582ae' }]} onPress={handleShare}>
              <Text style={styles.shareBtnIcon}>📋</Text>
              <Text style={styles.shareBtnText}>COPY</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fef6e4',
  },
  container: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  navBar: {
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#001858',
    margin: 16,
    marginBottom: 0,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  navBarLeft: {
    flexDirection: 'column',
  },
  navBarTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#001858',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: -1,
  },
  navBarSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  navBarLabel: {
    fontSize: 12,
    color: '#001858',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  navBarCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#001858',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dotOnline: {
    width: 10,
    height: 10,
    backgroundColor: '#06ffa5',
    borderRadius: 5,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#001858',
  },
  navBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    borderWidth: 3,
    borderColor: '#001858',
    padding: 6,
    paddingHorizontal: 8,
    shadowColor: '#001858',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  mainWrapperBox: {
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#001858',
    padding: 20,
    marginTop: 16,
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  wrapperTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#001858',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: -1,
    marginBottom: 12,
  },
  wrapperSubtitle: {
    fontSize: 14,
    color: '#001858',
    textAlign: 'center',
    marginBottom: 24,
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  playerCard: {
    borderWidth: 3,
    borderColor: '#001858',
    backgroundColor: '#ffffff',
    width: '45%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001858',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  playerIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  playerNameText: {
    fontWeight: 'bold',
    color: '#001858',
    fontSize: 14,
  },
  hostPanel: {
    borderWidth: 3,
    borderColor: '#001858',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#001858',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  hostPanelLabel: {
    fontWeight: 'bold',
    color: '#001858',
    textAlign: 'center',
    marginBottom: 12,
  },
  dropdownBox: {
    borderWidth: 3,
    borderColor: '#f582ae', // Pink border from web screenshot
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontWeight: 'bold',
    color: '#001858',
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
  inviteWrapperBox: {
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#001858',
    padding: 20,
    marginTop: 24,
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  inviteTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#001858',
    marginBottom: 16,
  },
  codeSuperBox: {
    backgroundColor: '#ffd803',
    borderWidth: 4,
    borderColor: '#001858',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#001858',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  hugeCodeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#001858',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  shareRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    flex: 1,
    borderWidth: 3,
    borderColor: '#001858',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001858',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    paddingHorizontal: 2,
  },
  shareBtnIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  shareBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 10,
    textShadowColor: '#001858',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});
