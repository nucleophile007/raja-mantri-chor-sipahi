export type RmcsCharacter = 'RAJA' | 'MANTRI' | 'CHOR' | 'SIPAHI';

export interface RmcsPlayer {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  character?: RmcsCharacter;
}

export interface RmcsRoundResult {
  round: number;
  players: {
    id: string;
    character: RmcsCharacter;
    scoreChanged: number;
    totalScore: number;
  }[];
  mantriId: string;
  chorId: string;
  guessCorrect: boolean;
}

export interface RmcsGameState {
  gameToken: string;
  gameStatus: 'WAITING' | 'DISTRIBUTING' | 'KING_REVEALED' | 'GUESSING_MANTRI' | 'ROUND_END' | 'GAME_END';
  players: RmcsPlayer[];
  currentRound: number;
  maxRounds: number;
  roundHistory: RmcsRoundResult[];
}

export interface RmcsSession {
  gameToken: string;
  playerId: string;
  playerName: string;
}

export interface RmcsValidateSessionResponse {
  valid: boolean;
  hasSession: boolean;
  gameToken?: string;
  playerId?: string;
  playerName?: string;
  isHost?: boolean;
  gameStatus?: string;
  currentRound?: number;
  maxRounds?: number;
}
