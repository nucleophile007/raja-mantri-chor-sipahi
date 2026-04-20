export interface ImposterSession {
  gameToken: string;
  playerId: string;
  playerName: string;
}

export interface ValidateSessionResponse {
  hasSession: boolean;
  valid: boolean;
  gameToken?: string;
  playerName?: string;
  playerId?: string;
  isHost?: boolean;
  gameStatus?: string;
  source?: 'body' | 'headers' | 'cookie' | 'none';
  error?: string;
  currentGame?: {
    gameToken: string;
    playerName: string;
    gameStatus: string;
    isHost: boolean;
    playerCount: number;
  } | null;
}

export interface StatePreviewResponse {
  success: boolean;
  error?: string;
  source?: 'query' | 'headers' | 'cookie' | 'none';
  gameState?: {
    gameToken: string;
    gameStatus: string;
    playerCount: number;
    hostName?: string;
    players?: Array<{
      name: string;
      hasScratched: boolean;
      hasVoted: boolean;
      isHost: boolean;
    }>;
  };
}

export interface ImposterGameAction {
  type:
    | 'PLAYER_JOINED'
    | 'PLAYER_LEFT'
    | 'PLAYER_KICKED'
    | 'GAME_STARTED'
    | 'CARDS_DEALT'
    | 'SCRATCHING'
    | 'PLAYER_SCRATCHED'
    | 'MILESTONE'
    | 'DISCUSSION_START'
    | 'DISCUSSION'
    | 'VOTING_START'
    | 'VOTING'
    | 'PLAYER_VOTED'
    | 'GAME_ENDED'
    | 'WORD_READY'
    | 'BACK_TO_LOBBY'
    | 'PLAYER_ENTERED_LOBBY'
    | 'HOST_CHANGED';
  playerName?: string;
  message?: string;
  status?: string;
  result?: string;
  word?: string;
  voteCount?: number;
  scratchedCount?: number;
  totalActive?: number;
  newHostName?: string;
  kickedPlayerName?: string;
  [key: string]: any;
}
