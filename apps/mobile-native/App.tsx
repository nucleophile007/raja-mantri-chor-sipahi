import React, { useCallback, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text } from 'react-native';
import { colors } from './src/theme/colors';
import { GameProvider, useGame } from './src/context/GameContext';
import { usePusher } from './src/hooks/usePusher';
import { ImposterGameAction } from './src/types/imposter';
import HomeScreen from './src/screens/HomeScreen';
import LobbyScreen from './src/screens/LobbyScreen';
import ScratchCardScreen from './src/screens/ScratchCardScreen';
import DiscussionScreen from './src/screens/DiscussionScreen';
import VotingScreen from './src/screens/VotingScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import ArcadeScreen from './src/screens/ArcadeScreen';
import RmcsApp from './src/RmcsApp';

function AppShell(): React.JSX.Element {
  const { gameState, updateGameState } = useGame();

  const handleGameAction = useCallback(
    (action: ImposterGameAction) => {
      console.log('[🎮 Game Event]', action.type, { payload: action });

      switch (action.type) {
        // Player management
        case 'PLAYER_JOINED':
          if (action.playerName) {
            updateGameState(prev => {
              const playerExists = prev.players.some((p) => p.name === action.playerName);
              if (!playerExists) {
                console.log('[➕ Player Joined]', action.playerName);
                return {
                  players: [
                    ...prev.players,
                    {
                      name: action.playerName!,
                      hasScratched: false,
                      hasVoted: false,
                      isHost: action.isHost || false,
                      isInLobby: true,
                    },
                  ],
                };
              }
              return {}; // no change
            });
          }
          break;

        case 'PLAYER_LEFT':
        case 'PLAYER_KICKED':
          if (action.playerName || action.kickedPlayerName) {
            const leavingName = action.playerName || action.kickedPlayerName || '';
            updateGameState(prev => ({
              players: prev.players.filter((p) => p.name !== leavingName)
            }));
            console.log('[➖ Player Left]', leavingName);
          }
          break;

        // Gameplay events
        case 'PLAYER_SCRATCHED':
          if (action.playerName) {
            updateGameState(prev => ({
              players: prev.players.map((player) =>
                player.name === action.playerName
                  ? { ...player, hasScratched: true }
                  : player
              ),
            }));
            console.log('[✂️ Scratched]', action.playerName);
          }
          break;

        case 'GAME_STARTED':
          if (action.status) {
            updateGameState({ gameStatus: action.status as any });
            console.log('[🎮 Game State Changed]', action.status);
          } else {
            updateGameState({ gameStatus: 'CARDS_DEALT' });
            console.log('[🎴 Cards Dealt]');
          }
          break;
        
        case ('VOTING_STARTED' as any):
        case 'VOTING_START':
        case 'VOTING':
          updateGameState({ 
            gameStatus: 'VOTING',
            ...((action as any).votingStartedAt ? { votingStartedAt: (action as any).votingStartedAt } as any : {}),
            ...((action as any).votingTimeout ? { votingTimeout: (action as any).votingTimeout } as any : {})
          });
          console.log('[🗳️ Voting Phase]');
          break;

        case 'PLAYER_VOTED':
          if (action.voterName) {
            updateGameState(prev => ({
              voteCount: (action as any).votedCount !== undefined ? (action as any).votedCount : ((prev.voteCount || 0) + 1),
              players: prev.players.map((player) =>
                player.name === action.voterName
                  ? { ...player, hasVoted: true }
                  : player
              ),
            }));
            console.log('[🗳️ Vote Cast]', action.voterName);
          }
          break;

        case 'GAME_ENDED':
          if ((action as any).result) {
            updateGameState({
              gameStatus: 'RESULT',
              result: {
                winner: (action as any).result as any,
                imposterName: (action as any).imposterName,
                voteResults: (action as any).voteResults || [],
              },
            });
            console.log('[🏁 Game Ended]');
          } else {
            updateGameState({ gameStatus: 'RESULT' });
          }
          break;

        case 'WORD_READY':
          if (action.word) {
            updateGameState({ word: action.word });
            console.log('[📝 Word Revealed]', action.word);
          }
          break;

        case 'HOST_CHANGED':
          if (action.newHostName) {
            updateGameState(prev => ({
              players: prev.players.map((player) => ({
                ...player,
                isHost: player.name === action.newHostName,
              })),
            }));
            console.log('[👑 New Host]', action.newHostName);
          }
          break;

        // Reset to lobby
        case 'BACK_TO_LOBBY':
          updateGameState(prev => ({
            gameStatus: 'WAITING',
            myCard: null,
            myRole: null,
            imposterName: null,
            word: null,
            voteCount: 0,
            result: {
              winner: null,
              imposterName: null,
              voteResults: [],
            },
            hostInLobby: false,
            players: prev.players.map(p => ({
              ...p,
              hasScratched: false,
              hasVoted: false,
              isInLobby: false,
            }))
          }));
          console.log('[🔄 Back to Lobby]');
          break;

        case 'HOST_IN_LOBBY':
          updateGameState(prev => ({
            hostInLobby: true,
            players: prev.players.map(p =>
              p.isHost ? { ...p, isInLobby: true } : p
            )
          }));
          console.log('[👑 Host returned to Lobby]');
          break;

        case 'PLAYER_ENTERED_LOBBY':
          if (action.playerName) {
            updateGameState(prev => ({
              players: prev.players.map(p =>
                p.name === action.playerName ? { ...p, isInLobby: true } : p
              )
            }));
            console.log('[👋 Player returned to Lobby]', action.playerName);
          }
          break;

        case 'MILESTONE':
          console.log('[🎯 Milestone]', action.message);
          break;

        default:
          console.log('[⚠️ Unknown Event]', action.type);
          break;
      }
    },
    [updateGameState]
  );

  usePusher({
    gameToken: gameState.gameToken || '',
    playerId: gameState.playerId || '',
    onAction: handleGameAction,
  });

  if (!gameState.gameToken) {
    return <HomeScreen />;
  }

  switch (gameState.gameStatus) {
    case 'CARDS_DEALT':
    case 'SCRATCHING':
      return <ScratchCardScreen onNavigate={() => {}} onGameAction={handleGameAction} />;
    case 'DISCUSSION':
      return <DiscussionScreen onNavigate={() => {}} />;
    case 'VOTING':
      return <VotingScreen onNavigate={() => {}} />;
    case 'RESULT':
      return <ResultsScreen onNavigate={() => {}} />;
    case 'WAITING':
    default:
      return <LobbyScreen />;
  }
}

export default function App(): React.JSX.Element {
  const [activeGame, setActiveGame] = useState<'imposter' | 'rmcs' | null>(null);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.shell}>
        {activeGame === null && <ArcadeScreen onSelectGame={setActiveGame} />}
        {activeGame === 'imposter' && (
          <GameProvider>
            <AppShell />
          </GameProvider>
        )}
        {activeGame === 'rmcs' && (
          <RmcsApp onBackToArcade={() => setActiveGame(null)} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  shell: {
    flex: 1,
  },
});
