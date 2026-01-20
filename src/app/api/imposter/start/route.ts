import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { selectImposter, MIN_PLAYERS } from '@/lib/imposterLogic';
import { broadcastImposterAction } from '@/lib/pusher';
import { generateWord } from '@/lib/gemini';

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId } = await request.json();

        if (!gameToken || !playerId) {
            return NextResponse.json(
                { error: 'Game token and player ID are required' },
                { status: 400 }
            );
        }

        const game = await getImposterGame(gameToken);

        if (!game) {
            return NextResponse.json(
                { error: 'Game not found' },
                { status: 404 }
            );
        }

        // Check if player is host
        const player = game.players.find(p => p.id === playerId);
        if (!player?.isHost) {
            return NextResponse.json(
                { error: 'Only host can start the game' },
                { status: 403 }
            );
        }

        if (game.gameStatus !== 'WAITING') {
            return NextResponse.json(
                { error: 'Game has already started' },
                { status: 400 }
            );
        }

        // CRITICAL: Filter players to only those in lobby FIRST, before selecting imposter
        const lobbyPlayers = game.players.filter(p => p.isActive && p.isInLobby);

        if (lobbyPlayers.length < MIN_PLAYERS) {
            return NextResponse.json(
                { error: `Need at least ${MIN_PLAYERS} players in lobby to start` },
                { status: 400 }
            );
        }

        // Select random imposter from ONLY players who are in the lobby
        const imposterId = selectImposter(lobbyPlayers);

        // Update game state IMMEDIATELY (without waiting for word)
        game.imposterId = imposterId;
        game.gameStatus = 'CARDS_DEALT';
        game.hostInLobby = false;
        game.word = generateWord(); // Instant selection from word bank
        console.log(`✅ Word selected: ${game.word}`);

        // Update players array with only lobby players, reset their state
        game.players = lobbyPlayers.map(p => ({
            ...p,
            hasScratched: false,
            hasVoted: false
        }));
        game.votes = [];
        game.result = null;
        game.endReason = null;

        await updateImposterGame(gameToken, game);

        // Broadcast GAME_STARTED action for instant UI update
        await broadcastImposterAction(gameToken, {
            type: 'GAME_STARTED',
            status: 'CARDS_DEALT'
        });



        return NextResponse.json({
            success: true,
            message: 'Game started! Cards are being dealt.'
        });
    } catch (error) {
        console.error('Error starting Imposter game:', error);
        return NextResponse.json(
            { error: 'Failed to start game' },
            { status: 500 }
        );
    }
}
