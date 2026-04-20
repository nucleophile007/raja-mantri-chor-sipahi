import React, { createContext, useState, useCallback, useContext } from 'react';
import { ImposterSession } from '../types/imposter';

export interface GamePlayer {
  name: string;
  hasScratched: boolean;
  hasVoted: boolean;
  isHost: boolean;
  isImposter?: boolean;
  voteCount?: number;
  isInLobby?: boolean;
}

export interface GameState {
  gameToken: string | null;
  playerId: string | null;
  playerName: string | null;
  gameStatus:
    | 'WAITING'
    | 'CARDS_DEALT'
    | 'SCRATCHING'
    | 'DISCUSSION'
    | 'VOTING'
    | 'RESULT'
    | null;
  players: GamePlayer[];
  myCard: string | null;
  myRole: 'IMPOSTER' | 'PLAYER' | null;
  imposterName: string | null;
  word: string | null;
  voteCount: number;
  hostInLobby?: boolean;
  result: {
    winner: 'PLAYERS_WIN' | 'IMPOSTER_WINS' | null;
    imposterName: string | null;
    voteResults: Array<{
      playerName: string;
      voteCount: number;
      isImposter: boolean;
    }>;
  };
  error: string | null;
  loading: boolean;
}

interface GameContextType {
  gameState: GameState;
  updateGameState: (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => void;
  resetGameState: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultGameState: GameState = {
  gameToken: null,
  playerId: null,
  playerName: null,
  gameStatus: null,
  players: [],
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
  error: null,
  loading: false,
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(defaultGameState);

  const updateGameState = useCallback(
    (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => {
      setGameState((prev) => {
        const result = typeof updates === 'function' ? updates(prev) : updates;
        return {
          ...prev,
          ...result,
        };
      });
    },
    []
  );

  const resetGameState = useCallback(() => {
    setGameState(defaultGameState);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setGameState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setGameState((prev) => ({ ...prev, error }));
  }, []);

  const value: GameContextType = {
    gameState,
    updateGameState,
    resetGameState,
    setLoading,
    setError,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
