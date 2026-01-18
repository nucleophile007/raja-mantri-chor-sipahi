// Imposter Game Logic

import { ImposterGame, ImposterPlayer, ImposterClientState, VoteClient, VoteResult } from '@/types/imposter';

// Get minimum players required to start
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;

// Select a random imposter from players
export function selectImposter(players: ImposterPlayer[]): string {
    const activePlayers = players.filter(p => p.isActive);
    const randomIndex = Math.floor(Math.random() * activePlayers.length);
    return activePlayers[randomIndex].id;
}

// Check if all active players have scratched
export function allPlayersScratched(players: ImposterPlayer[]): boolean {
    return players.filter(p => p.isActive).every(p => p.hasScratched);
}

// Check if all active players have voted
export function allPlayersVoted(players: ImposterPlayer[]): boolean {
    return players.filter(p => p.isActive).every(p => p.hasVoted);
}

// Calculate voting result
export function calculateVotingResult(game: ImposterGame): {
    mostVotedId: string;
    isCorrect: boolean;
    voteCount: Record<string, number>;
} {
    const voteCount: Record<string, number> = {};

    // Count votes
    game.votes.forEach(vote => {
        voteCount[vote.votedForId] = (voteCount[vote.votedForId] || 0) + 1;
    });

    // Find most voted
    let mostVotedId = '';
    let maxVotes = 0;
    let tieExists = false;

    Object.entries(voteCount).forEach(([playerId, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            mostVotedId = playerId;
            tieExists = false;
        } else if (count === maxVotes) {
            tieExists = true;
        }
    });

    // If tie, imposter wins
    if (tieExists) {
        return { mostVotedId: '', isCorrect: false, voteCount };
    }

    return {
        mostVotedId,
        isCorrect: mostVotedId === game.imposterId,
        voteCount
    };
}

// Transfer host to another player
export function transferHost(players: ImposterPlayer[], currentHostId: string): ImposterPlayer[] {
    const activePlayers = players.filter(p => p.isActive && p.id !== currentHostId);

    if (activePlayers.length === 0) {
        return players;
    }

    // Pick random active player to be new host
    const randomIndex = Math.floor(Math.random() * activePlayers.length);
    const newHostId = activePlayers[randomIndex].id;

    return players.map(p => ({
        ...p,
        isHost: p.id === newHostId
    }));
}

// Convert game to client-safe state (NO PLAYER IDs EXPOSED)
export function toClientState(
    game: ImposterGame,
    requestingPlayerId: string
): ImposterClientState {
    const isGameOver = game.gameStatus === 'RESULT';
    const requestingPlayer = game.players.find(p => p.id === requestingPlayerId);
    const isImposter = game.imposterId === requestingPlayerId;

    // Determine what card content to show
    let myCard: string | null = null;
    if (requestingPlayer?.hasScratched && game.word) {
        myCard = isImposter ? 'IMPOSTER' : game.word;
    }

    // Convert votes for client (only show voter names, not who they voted for)
    const votes: VoteClient[] = game.votes.map(v => {
        const voter = game.players.find(p => p.id === v.voterId);
        return { voterName: voter?.name || 'Unknown' };
    });

    // Build vote results (only if game over)
    let voteResults: VoteResult[] | null = null;
    if (isGameOver) {
        const voteCount: Record<string, number> = {};
        game.votes.forEach(v => {
            voteCount[v.votedForId] = (voteCount[v.votedForId] || 0) + 1;
        });

        voteResults = game.players
            .filter(p => p.isActive)
            .map(p => ({
                playerName: p.name,
                voteCount: voteCount[p.id] || 0,
                isImposter: p.id === game.imposterId
            }))
            .sort((a, b) => b.voteCount - a.voteCount);
    }

    // Get imposter name (only if game over)
    const imposterName = isGameOver
        ? game.players.find(p => p.id === game.imposterId)?.name || null
        : null;

    return {
        gameToken: game.gameToken,
        // Only send ACTIVE players to client (reduces payload and fixes privacy concern)
        players: game.players
            .filter(p => p.isActive)
            .map(p => ({
                name: p.name,
                isHost: p.isHost,
                isActive: p.isActive,
                hasScratched: p.hasScratched,
                hasVoted: p.hasVoted,
                isInLobby: p.isInLobby || false,
                isMe: p.id === requestingPlayerId  // Only flag, no ID exposed
            })),
        gameStatus: game.gameStatus,
        myCard,
        myName: requestingPlayer?.name || null,
        amIHost: requestingPlayer?.isHost || false,
        amIImposter: isGameOver ? isImposter : null,  // Only reveal after game ends
        imposterName,
        hostInLobby: game.hostInLobby || false,       // For back-to-lobby flow
        votes,
        voteResults,
        result: game.result,
        endReason: game.endReason
    };
}

// Check if game should end due to player leaving
export function checkGameEndCondition(game: ImposterGame, leavingPlayerId: string): {
    shouldEnd: boolean;
    result: 'PLAYERS_WIN' | 'IMPOSTER_WINS' | null;
    reason: string | null;
} {
    const isImposter = game.imposterId === leavingPlayerId;
    const activePlayers = game.players.filter(p => p.isActive && p.id !== leavingPlayerId);

    // If imposter leaves, players win
    if (isImposter && game.gameStatus !== 'WAITING') {
        return {
            shouldEnd: true,
            result: 'PLAYERS_WIN',
            reason: 'Imposter left the game'
        };
    }

    // If no active players left (besides imposter who hasn't left)
    const nonImposterActive = activePlayers.filter(p => p.id !== game.imposterId);
    if (nonImposterActive.length === 0 && game.gameStatus !== 'WAITING') {
        return {
            shouldEnd: true,
            result: 'IMPOSTER_WINS',
            reason: 'All players left the game'
        };
    }

    // If less than minimum players in waiting, don't end but can't start
    if (game.gameStatus === 'WAITING' && activePlayers.length < MIN_PLAYERS) {
        return { shouldEnd: false, result: null, reason: null };
    }

    return { shouldEnd: false, result: null, reason: null };
}
