import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Share } from 'react-native';
import { colors } from '../../theme/colors';
import { RmcsSession, RmcsGameState, RmcsPlayer } from '../../types/rmcs';
import { useRmcsPusher } from '../../hooks/useRmcsPusher';
import { getRmcsState, leaveRmcsGame, distributeChits, revealKing, submitGuess, nextRound } from '../../lib/rmcsApi';
import ChitAnimationModal from './ChitAnimationModal';

// A mock placeholder for the question mark avatar
const QuestionMarkAvatar = () => (
  <View style={styles.avatarBox}>
    <Text style={styles.avatarText}>?</Text>
  </View>
);

export default function RmcsGameRoom({ session, onLeave }: { session: RmcsSession, onLeave: () => void }) {
  const [gameState, setGameState] = useState<RmcsGameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showChitAnimation, setShowChitAnimation] = useState(false);

  const me = gameState?.players.find(p => p.id === session.playerId);
  const isHost = me?.isHost;
  const isMantri = me?.character === 'MANTRI';

  useEffect(() => {
    if (gameState?.gameStatus === 'DISTRIBUTING') {
      setShowChitAnimation(true);
    } else {
      setShowChitAnimation(false);
    }
  }, [gameState?.gameStatus]);

  useEffect(() => {
    if (gameState?.gameStatus === 'DISTRIBUTING' && isHost) {
      const timer = setTimeout(async () => {
        try { await revealKing(session); } catch (e) { console.error('Auto reveal error', e); }
      }, 8500);
      return () => clearTimeout(timer);
    }
  }, [gameState?.gameStatus, isHost]);

  useRmcsPusher({
    gameToken: session.gameToken,
    playerId: session.playerId,
    onStateUpdate: setGameState,
  });

  useEffect(() => {
    getRmcsState(session).then(res => {
      setGameState(res.gameState);
      setLoading(false);
    }).catch(err => {
      Alert.alert('Error', 'Failed to fetch game state');
      onLeave();
    });
  }, []);

  const handleLeave = async () => {
    Alert.alert(
      "Leave Game",
      "Are you sure you want to leave the game?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive",
          onPress: async () => {
            await leaveRmcsGame(session);
            onLeave();
          }
        }
      ]
    );
  };

  const handleDistribute = async () => {
    try { await distributeChits(session); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleRevealClick = async () => {
    try { await revealKing(session); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleGuess = async () => {
    if (!selectedPlayer) return;
    try { await submitGuess(session, selectedPlayer); setSelectedPlayer(null); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleNextRound = async () => {
    try { await nextRound(session); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleCopyCode = async () => {
    try {
      await Share.share({ message: session.gameToken });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  if (loading || !gameState) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }



  // Fill up to 4 slots
  const playerSlots = [...gameState.players];
  while(playerSlots.length < 4) {
    playerSlots.push({ id: `empty-${playerSlots.length}`, name: '', score: 0, isHost: false } as any);
  }

  return (
    <SafeAreaView style={styles.root}>
      <ChitAnimationModal visible={showChitAnimation} />
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* TOP BAR */}
        <View style={styles.pixelCard}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.appTitle}>RMCS  Game</Text>
              <Text style={styles.appSubtitle}>Round {gameState.currentRound} of {gameState.maxRounds}</Text>
            </View>
            <View style={styles.topBarRight}>
              <View style={styles.tokenBadge}>
                <Text style={styles.tokenBadgeText}>{session.gameToken.split('').join(' ')}</Text>
              </View>
              <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
                <Text style={styles.leaveBtnText}>🚪 LEAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* LOBBY WAITING SCREEN */}
        {gameState.gameStatus === 'WAITING' && (
          <>
            {/* Share Code Section */}
            {gameState.currentRound === 0 && gameState.players.length < 4 && (
              <View style={[styles.pixelCard, { marginTop: 16 }]}>
                <Text style={styles.sectionHeader}>📱 Share Game Code</Text>
                <View style={styles.dashedBox}>
                  <Text style={styles.dashedBoxLabel}>Game Code:</Text>
                  <View style={styles.bigTokenBadge}>
                    <Text style={styles.bigTokenBadgeText}>{session.gameToken.split('').join(' ')}</Text>
                  </View>
                  <Text style={styles.dashedBoxSubLabel}>Share this code with your friends to join</Text>
                </View>
                <View style={styles.shareButtonsRow}>
                  <TouchableOpacity onPress={handleCopyCode} style={[styles.shareBtn, { backgroundColor: colors.primary }]}>
                    <Text style={styles.shareBtnText}>📋 COPY CODE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCopyCode} style={[styles.shareBtn, { backgroundColor: colors.success }]}>
                    <Text style={styles.shareBtnText}>📤 WHATSAPP</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleCopyCode} style={[styles.shareBtn, { backgroundColor: '#000', marginTop: 16 }]}>
                   <Text style={[styles.shareBtnText, { color: '#fff' }]}>𝕏 SHARE ON X</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Players Grid */}
            <View style={[styles.pixelCard, { marginTop: 16 }]}>
              <Text style={styles.sectionHeader}>Waiting for Players ({gameState.players.length}/4)</Text>
              <Text style={styles.appSubtitle}>Game will have {gameState.maxRounds} rounds</Text>

              <View style={styles.playersGrid}>
                {playerSlots.map((p, idx) => {
                  const isEmpty = !p.name;
                  if (isEmpty) {
                    return (
                      <View key={`empty-${idx}`} style={styles.emptySlot}>
                        <Text style={styles.emptySlotText}>Waiting...</Text>
                      </View>
                    );
                  }
                  return (
                    <View key={p.id} style={styles.filledSlot}>
                      <QuestionMarkAvatar />
                      <Text style={styles.slotPlayerName}>{p.name}</Text>
                      {p.isHost && (
                        <View style={styles.hostBadge}>
                          <Text style={styles.hostBadgeText}>HOST</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {isHost && gameState.players.length === 4 && (
                <TouchableOpacity style={styles.distributeBtn} onPress={handleDistribute}>
                  <Text style={styles.distributeBtnText}>🎲 DISTRIBUTE CHITS</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* IN-GAME SCREENS */}
        {gameState.gameStatus !== 'WAITING' && (
           <View style={[styles.pixelCard, { marginTop: 16 }]}>
              <Text style={styles.sectionHeader}>Status: {gameState.gameStatus}</Text>
              {me?.character && <Text style={styles.roleText}>Your Role: {me.character}</Text>}
              
              <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Players:</Text>
              {gameState.players.map(p => (
                <View key={p.id} style={styles.compactPlayerRow}>
                   <Text style={styles.compactPlayerText}>{p.name} {p.id === session.playerId ? '(You)' : ''}</Text>
                   <Text style={styles.compactPlayerScore}>Score: {p.score}</Text>
                </View>
              ))}

              {/* Auto reveal timer triggers the transition for all characters during DISTRIBUTING */}

              {gameState.gameStatus === 'KING_REVEALED' && isMantri && (
                <View style={[styles.dashedBox, { marginTop: 20 }]}>
                  <Text style={styles.sectionHeader}>🎯 Guess the Chor!</Text>
                  {gameState.players.filter(p => p.id !== session.playerId && p.character !== 'RAJA' && p.character !== 'MANTRI').map(p => (
                     <TouchableOpacity 
                       key={p.id} 
                       style={[styles.filledSlot, { width: '100%', marginBottom: 10 }, selectedPlayer === p.id && { borderColor: colors.primary, borderWidth: 4 }]} 
                       onPress={() => setSelectedPlayer(p.id)}
                     >
                       <QuestionMarkAvatar />
                       <Text style={styles.slotPlayerName}>{p.name}</Text>
                     </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.distributeBtn, { marginTop: 10, opacity: selectedPlayer ? 1 : 0.5 }]} onPress={handleGuess} disabled={!selectedPlayer}>
                    <Text style={styles.distributeBtnText}>✓ SUBMIT GUESS</Text>
                  </TouchableOpacity>
                </View>
              )}

              {gameState.gameStatus === 'ROUND_END' && isHost && (
                <TouchableOpacity style={styles.distributeBtn} onPress={handleNextRound}>
                  <Text style={styles.distributeBtnText}>NEXT ROUND</Text>
                </TouchableOpacity>
              )}
              
              {gameState.gameStatus === 'GAME_END' && (
                 <TouchableOpacity style={styles.distributeBtn} onPress={handleLeave}>
                    <Text style={styles.distributeBtnText}>BACK TO MAIN</Text>
                 </TouchableOpacity>
              )}
           </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, alignItems: 'center' },
  pixelCard: {
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.border,
    padding: 16,
    width: '100%',
    maxWidth: 800,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  appTitle: {
    color: colors.border,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  appSubtitle: {
    color: colors.border,
    fontSize: 14,
    marginTop: 4,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenBadge: {
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tokenBadgeText: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: 2,
  },
  leaveBtn: {
    backgroundColor: colors.danger,
    borderWidth: 4,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  leaveBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
  },
  sectionHeader: {
    color: colors.border,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 8,
  },
  dashedBox: {
    borderWidth: 4,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    marginVertical: 16,
  },
  dashedBoxLabel: {
    color: colors.border,
    fontSize: 14,
    marginBottom: 8,
  },
  bigTokenBadge: {
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.border,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  bigTokenBadgeText: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 32,
    letterSpacing: 4,
  },
  dashedBoxSubLabel: {
    color: colors.border,
    fontSize: 12,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  shareBtn: {
    flex: 1,
    borderWidth: 4,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnText: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 14,
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
    gap: 10,
  },
  emptySlot: {
    width: '48%',
    aspectRatio: 1.2,
    borderWidth: 4,
    borderColor: colors.muted,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  emptySlotText: {
    color: colors.muted,
    fontSize: 16,
  },
  filledSlot: {
    width: '48%',
    aspectRatio: 1.2,
    borderWidth: 4,
    borderColor: colors.success,
    backgroundColor: colors.surface,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBox: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 24,
  },
  slotPlayerName: {
    color: colors.border,
    fontSize: 16,
    fontWeight: '900',
  },
  hostBadge: {
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    bottom: 8,
  },
  hostBadgeText: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 10,
  },
  distributeBtn: {
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.border,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  distributeBtnText: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 16,
  },
  roleText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  compactPlayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  compactPlayerText: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 16,
  },
  compactPlayerScore: {
    color: colors.border,
    fontWeight: '900',
    fontSize: 16,
  }
});
