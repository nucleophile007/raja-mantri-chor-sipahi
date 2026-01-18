import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { allPlayersScratched } from '@/lib/imposterLogic';
import { broadcastImposterAction } from '@/lib/pusher';

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

        const player = game.players.find(p => p.id === playerId);
        if (!player || !player.isActive) {
            return NextResponse.json(
                { error: 'Player not found or not active' },
                { status: 404 }
            );
        }

        if (game.gameStatus !== 'CARDS_DEALT' && game.gameStatus !== 'SCRATCHING') {
            return NextResponse.json(
                { error: 'Cannot scratch card at this time' },
                { status: 400 }
            );
        }

        if (player.hasScratched) {
            // Already scratched, just return their card
            const isImposter = game.imposterId === playerId;
            return NextResponse.json({
                success: true,
                alreadyScratched: true,
                cardContent: isImposter ? 'IMPOSTER' : game.word
            });
        }

        // Mark player as scratched
        game.players = game.players.map(p =>
            p.id === playerId ? { ...p, hasScratched: true } : p
        );

        // Update game status
        if (game.gameStatus === 'CARDS_DEALT') {
            game.gameStatus = 'SCRATCHING';
        }

        // Check if all players scratched
        const allScratched = allPlayersScratched(game.players);
        if (allScratched) {
            game.gameStatus = 'DISCUSSION';
        }

        await updateImposterGame(gameToken, game);

        // Calculate counts for instant UI update
        const activePlayers = game.players.filter(p => p.isActive);
        const scratchedCount = activePlayers.filter(p => p.hasScratched).length;

        // Broadcast action for instant UI update
        await broadcastImposterAction(gameToken, {
            type: 'PLAYER_SCRATCHED',
            playerName: player.name,
            scratchedCount,
            totalActive: activePlayers.length
        });

        // Milestone: First player scratched!
        if (scratchedCount === 1) {
            await broadcastImposterAction(gameToken, {
                type: 'MILESTONE',
                message: `[FIRST] ${player.name} REVEALED THEIR CARD!`
            });
        }

        // Milestone: All players scratched!
        if (allScratched) {
            await broadcastImposterAction(gameToken, {
                type: 'MILESTONE',
                message: '[ALL CARDS REVEALED] DISCUSSION TIME!'
            });

            // Also broadcast game status change
            await broadcastImposterAction(gameToken, {
                type: 'GAME_STARTED',
                status: 'DISCUSSION'
            });

            // Force all clients to refresh state for consistency
            setTimeout(async () => {
                await broadcastImposterAction(gameToken, {
                    type: 'WORD_READY' // Reuse as generic refresh trigger
                });
            }, 500);
        }

        // Return card content to the player
        const isImposter = game.imposterId === playerId;

        // Handle race condition: word not ready yet
        if (!game.word && !isImposter) {
            return NextResponse.json({
                success: true,
                cardContent: 'LOADING...',
                wordNotReady: true, // Tell client to retry
                gameStatus: game.gameStatus
            });
        }

        return NextResponse.json({
            success: true,
            cardContent: isImposter ? 'IMPOSTER' : game.word,
            gameStatus: game.gameStatus
        });
    } catch (error) {
        console.error('Error scratching card:', error);
        return NextResponse.json(
            { error: 'Failed to scratch card' },
            { status: 500 }
        );
    }
}
