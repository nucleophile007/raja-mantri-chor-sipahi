export type Character = 'RAJA' | 'MANTRI' | 'CHOR' | 'SIPAHI';

export interface Player {
  id: string;
  name: string;
  character: Character | null;
  score: number;
  isHost: boolean;
  isActive: boolean;
  lastSeen: number; // Timestamp
}

export interface GameState {
  gameToken: string;
  players: Player[];
  currentRound: number;
  gameStatus: 'WAITING' | 'DISTRIBUTING' | 'KING_REVEALED' | 'MANTRI_GUESSING' | 'ROUND_END' | 'GAME_END';
  roundHistory: RoundResult[];
  maxRounds: number;
}

export interface RoundResult {
  round: number;
  players: {
    id: string;
    name: string;
    character: Character;
    pointsEarned: number;
  }[];
  mantriGuessedCorrectly: boolean;
  chorId: string;
  mantriGuessedId: string;
}
