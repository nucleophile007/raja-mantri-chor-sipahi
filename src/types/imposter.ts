// Imposter Game Types

export interface ImposterGame {
    gameToken: string;
    hostId: string;
    players: ImposterPlayer[];
    gameStatus: ImposterGameStatus;
    word: string | null;        // The actual word (null before game starts)
    imposterId: string | null;  // Player who is imposter (null before game starts)
    votes: Vote[];              // Anonymous votes
    result: ImposterResult | null;
    createdAt: number;
    endedAt: number | null;
    endReason: string | null;
    hostInLobby: boolean;       // True when host has returned to lobby after game end
}

export type ImposterGameStatus =
    | 'WAITING'       // Waiting for players (3-20)
    | 'CARDS_DEALT'   // Cards distributed, waiting for scratches
    | 'SCRATCHING'    // Players are scratching their cards
    | 'DISCUSSION'    // Discussion phase, waiting for host to start voting
    | 'VOTING'        // Anonymous voting in progress
    | 'RESULT';       // Game ended, showing result

export type ImposterResult = 'PLAYERS_WIN' | 'IMPOSTER_WINS';

export interface ImposterPlayer {
    id: string;
    name: string;
    isHost: boolean;
    isActive: boolean;
    hasScratched: boolean;
    hasVoted: boolean;
    isInLobby: boolean; // Tracks if player has returned to lobby screen
    joinedAt: number;
}

export interface Vote {
    voterId: string;      // Hidden from other players in API responses
    votedForId: string;
    timestamp: number;
}

// State sent to clients (hides sensitive info like player IDs)
// Player IDs are NEVER sent to prevent impersonation attacks
export interface ImposterClientState {
    gameToken: string;
    players: ImposterPlayerClient[];  // No IDs exposed
    gameStatus: ImposterGameStatus;
    myCard: string | null;          // Only included for the requesting player
    myName: string | null;          // Current player's name for identification
    amIHost: boolean;               // Is current player the host
    amIImposter: boolean | null;    // Only revealed after game ends
    imposterName: string | null;    // Only revealed after game ends
    hostInLobby: boolean;           // True when host is in lobby (for "Back to Lobby" flow)
    votes: VoteClient[];            // Only shows who voted, not for whom (by name)
    voteResults: VoteResult[] | null;  // Only shown after game ends
    result: ImposterResult | null;
    endReason: string | null;
}

// No player ID exposed
export interface ImposterPlayerClient {
    name: string;
    isHost: boolean;
    isActive: boolean;
    hasScratched: boolean;
    hasVoted: boolean;
    isInLobby: boolean;
    isMe: boolean;  // Flag for current player
}

// Vote visible during voting (only shows someone voted, not for whom)
export interface VoteClient {
    voterName: string;
}

// Vote result shown after game ends
export interface VoteResult {
    playerName: string;
    voteCount: number;
    isImposter: boolean;
}

// ============================================
// GAME ACTIONS - For instant UI updates via Pusher
// These are broadcast to all clients who apply them locally
// ============================================

export type ImposterGameAction =
    | { type: 'PLAYER_JOINED'; playerName: string; isHost: boolean }
    | { type: 'PLAYER_LEFT'; playerName: string; newHostName?: string }
    | { type: 'PLAYER_SCRATCHED'; playerName: string; scratchedCount: number; totalActive: number }
    | { type: 'GAME_STARTED'; status: ImposterGameStatus }
    | { type: 'VOTING_STARTED' }
    | { type: 'PLAYER_VOTED'; voterName: string; votedCount: number; totalActive: number }
    | { type: 'GAME_ENDED'; result: ImposterResult; imposterName: string; endReason: string; voteResults?: VoteResult[] }
    | { type: 'WORD_READY' }        // Word generated and ready in background
    | { type: 'MILESTONE'; message: string }  // Progress notification (first scratch, all scratch, etc.)
    | { type: 'HOST_IN_LOBBY' }     // Host clicked "Back to Lobby" - others can now follow
    | { type: 'PLAYER_ENTERED_LOBBY'; playerName: string }
    | { type: 'BACK_TO_LOBBY' };    // Full lobby reset complete
