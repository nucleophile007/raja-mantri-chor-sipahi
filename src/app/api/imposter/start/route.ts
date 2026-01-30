import { NextRequest, NextResponse } from 'next/server';
import { withGameLock } from '@/lib/imposterStorage';
import { selectImposter, MIN_PLAYERS } from '@/lib/imposterLogic';
import { broadcastImposterAction } from '@/lib/pusher';
import { generateWord } from '@/lib/gemini';

interface StartResult {
    started: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId } = await request.json();

        if (!gameToken || !playerId) {
            return NextResponse.json({ error: 'Game token and player ID are required' }, { status: 400 });
        }

        const result = await withGameLock<StartResult>(gameToken, async (game) => {
            const player = game.players.find(p => p.id === playerId);
            if (!player?.isHost) throw new Error('Only host can start the game');
            if (game.gameStatus !== 'WAITING') throw new Error('Game has already started');

            const now = Date.now();
            // RELAXED LOGIC: Trust the stored `isActive` flag.
            // If the host is starting the game, they are definitely active.
            // Other players might be "Active" but just missed a heartbeat - give them the benefit of the doubt.
            const lobbyPlayers = game.players.filter(p =>
                (p.isActive && p.isInLobby) || (p.id === playerId) // Always include the host requesting start
            );

            if (lobbyPlayers.length < MIN_PLAYERS) {
                throw new Error(`Need at least ${MIN_PLAYERS} active players to start. (Found ${lobbyPlayers.length})`);
            }

            // Select random imposter
            const imposterId = selectImposter(lobbyPlayers);

            // Update game state
            game.imposterId = imposterId;
            game.gameStatus = 'CARDS_DEALT';
            game.hostInLobby = false;
            game.word = generateWord(); // Instant word bank

            // Prune the player list to ONLY those who made the cut
            game.players = lobbyPlayers.map(p => ({
                ...p,
                hasScratched: false,
                hasVoted: false
            }));
            game.votes = [];
            game.result = null;
            game.endReason = null;

            return { game, result: { started: true } };
        });

        if (!result) return NextResponse.json({ error: 'Game not found or lock failed' }, { status: 404 });

        // Broadcast
        await broadcastImposterAction(gameToken, {
            type: 'GAME_STARTED',
            status: 'CARDS_DEALT'
        });

        return NextResponse.json({ success: true, message: 'Game started!' });

    } catch (error: any) {
        console.error('Error starting game:', error);
        return NextResponse.json({ error: error.message || 'Failed to start game' }, { status: 500 });
    }
}
