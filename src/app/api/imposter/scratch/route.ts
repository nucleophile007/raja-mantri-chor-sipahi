import { NextRequest, NextResponse } from 'next/server';
import { withGameLock } from '@/lib/imposterStorage';
import { allPlayersScratched } from '@/lib/imposterLogic';
import { broadcastImposterAction } from '@/lib/pusher';
import { ImposterPlayer, ImposterGame } from '@/types/imposter';

interface ScratchResult {
    alreadyScratched: boolean;
    player: ImposterPlayer;
    game: ImposterGame;
    allScratched?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId } = await request.json();

        if (!gameToken || !playerId) {
            return NextResponse.json({ error: 'Game token and player ID are required' }, { status: 400 });
        }

        // Use distributed lock to ensure atomic updates
        const result = await withGameLock<ScratchResult>(gameToken, async (game) => {
            const player = game.players.find(p => p.id === playerId);
            if (!player || !player.isActive) {
                throw new Error('Player not found or not active');
            }

            if (game.gameStatus !== 'CARDS_DEALT' && game.gameStatus !== 'SCRATCHING') {
                throw new Error('Cannot scratch card at this time');
            }

            if (player.hasScratched) {
                return { game, result: { alreadyScratched: true, player, game } };
            }

            // Update player
            game.players = game.players.map(p =>
                p.id === playerId ? { ...p, hasScratched: true } : p
            );

            // Update status if needed
            if (game.gameStatus === 'CARDS_DEALT') {
                game.gameStatus = 'SCRATCHING';
            }

            // Check transition
            const allScratched = allPlayersScratched(game.players);
            if (allScratched) {
                game.gameStatus = 'DISCUSSION';
            }

            return { game, result: { alreadyScratched: false, player, game, allScratched } };
        });

        if (!result) {
            return NextResponse.json({ error: 'Game not found or lock failed' }, { status: 404 });
        }

        const { player, game, allScratched, alreadyScratched } = result;

        // If newly scratched, broadcast updates
        if (!alreadyScratched) {
            const activePlayers = game.players.filter(p => p.isActive);
            const scratchedCount = activePlayers.filter(p => p.hasScratched).length;

            // 1. Broadcast the scratch action (updates UI counters)
            await broadcastImposterAction(gameToken, {
                type: 'PLAYER_SCRATCHED',
                playerName: player.name,
                scratchedCount,
                totalActive: activePlayers.length
            });

            // 2. Milestones
            if (scratchedCount === 1) {
                await broadcastImposterAction(gameToken, {
                    type: 'MILESTONE',
                    message: `[FIRST] ${player.name} REVEALED THEIR CARD!`
                });
            }

            if (allScratched) {
                await broadcastImposterAction(gameToken, {
                    type: 'MILESTONE',
                    message: '[ALL CARDS REVEALED] DISCUSSION TIME!'
                });

                await broadcastImposterAction(gameToken, {
                    type: 'GAME_STARTED',
                    status: 'DISCUSSION'
                });

                // Force sync for consistency
                setTimeout(async () => {
                    await broadcastImposterAction(gameToken, { type: 'WORD_READY' });
                }, 500);
            }
        }

        const isImposter = game.imposterId === playerId;
        return NextResponse.json({
            success: true,
            cardContent: isImposter ? 'IMPOSTER' : game.word,
            gameStatus: game.gameStatus,
            alreadyScratched
        });

    } catch (error: any) {
        console.error('Error scratching card:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to scratch card' },
            { status: 500 }
        );
    }
}
