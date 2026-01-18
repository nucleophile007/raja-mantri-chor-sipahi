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

        const activePlayers = game.players.filter(p => p.isActive);
        if (activePlayers.length < MIN_PLAYERS) {
            return NextResponse.json(
                { error: `Need at least ${MIN_PLAYERS} players to start` },
                { status: 400 }
            );
        }


        // Select random imposter BEFORE generating word (instant)
        const imposterId = selectImposter(game.players);

        // Update game state IMMEDIATELY (without waiting for word)
        game.imposterId = imposterId;
        game.gameStatus = 'CARDS_DEALT';
        game.hostInLobby = false;
        game.word = null; // Will be set asynchronously

        // REMOVE players who were not in the lobby - they are kicked out entirely
        game.players = game.players
            .filter(p => p.isInLobby)  // Only keep players who joined the lobby
            .map(p => ({
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

        // Generate word in background (non-blocking)
        generateWord()
            .then(async (word) => {
                console.log(`✅ Word generated: ${word}`);

                // Fetch latest game state
                const currentGame = await getImposterGame(gameToken);
                if (!currentGame || currentGame.gameStatus !== 'CARDS_DEALT') {
                    console.log('⚠️ Game state changed, skipping word update');
                    return;
                }

                // Update word
                currentGame.word = word;
                await updateImposterGame(gameToken, currentGame);

                // Broadcast force-refresh so clients get the word
                await broadcastImposterAction(gameToken, {
                    type: 'WORD_READY'
                });

                console.log('📡 Word broadcast to all clients');
            })
            .catch((error) => {
                console.error('❌ Failed to generate word:', error);
                // Fallback: use a default word
                getImposterGame(gameToken).then(async (currentGame) => {
                    if (currentGame && !currentGame.word) {
                        currentGame.word = 'COFFEE'; // Fallback word
                        await updateImposterGame(gameToken, currentGame);
                        await broadcastImposterAction(gameToken, {
                            type: 'WORD_READY'
                        });
                    }
                });
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
