import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame } from '@/lib/imposterStorage';
import { toClientState } from '@/lib/imposterLogic';
import { getSessionCredentials } from '@/lib/imposterSession';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        let gameToken = searchParams.get('gameToken')?.toUpperCase() || null;
        let playerId = searchParams.get('playerId');
        let source: 'query' | 'headers' | 'cookie' | 'none' | 'body' = 'query';

        if (!gameToken || !playerId) {
            const creds = getSessionCredentials(request);
            if (!gameToken) gameToken = creds.gameToken;
            if (!playerId) playerId = creds.playerId;
            source = creds.source;
        }

        if (!gameToken) {
            return NextResponse.json(
                { success: false, error: 'Game token is required', source: 'none' },
                { status: 400 }
            );
        }

        const game = await getImposterGame(gameToken);

        if (!game) {
            return NextResponse.json(
                { success: false, error: 'Game not found', source },
                { status: 404 }
            );
        }

        // If playerId provided, return personalized state
        if (playerId) {
            const player = game.players.find(p => p.id === playerId);
            if (!player) {
                return NextResponse.json(
                    { success: false, error: 'Player not found in game', source },
                    { status: 404 }
                );
            }

            // SELF-HEALING: Check for stuck state (e.g. race condition missed the transition)
            // If everyone scratched but we are still in SCRATCHING, fix it now.
            if (game.gameStatus === 'SCRATCHING') {
                const { allPlayersScratched } = await import('@/lib/imposterLogic');
                const { withGameLock } = await import('@/lib/imposterStorage');
                const { broadcastImposterAction } = await import('@/lib/pusher');

                if (allPlayersScratched(game.players)) {
                    console.warn(`🚑 Healing stuck game ${gameToken}: Transitioning to DISCUSSION`);

                    // Perform the update safely
                    await withGameLock(gameToken, async (g) => {
                        g.gameStatus = 'DISCUSSION';
                        return { game: g, result: true };
                    });

                    // Broadcast the fix so everyone moves forward
                    await broadcastImposterAction(gameToken, {
                        type: 'GAME_STARTED',
                        status: 'DISCUSSION'
                    });

                    // Update local object for response
                    game.gameStatus = 'DISCUSSION';
                }
            }

            return NextResponse.json({
                success: true,
                source,
                gameState: toClientState(game, playerId)
            });
        }

        // If no playerId, return basic game info (for join page preview)
        return NextResponse.json({
            success: true,
            source,
            gameState: {
                gameToken: game.gameToken,
                gameStatus: game.gameStatus,
                playerCount: game.players.filter(p => p.isActive).length,
                hostName: game.players.find(p => p.isHost)?.name
            }
        });
    } catch (error) {
        console.error('Error fetching Imposter game state:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch game state', source: 'none' },
            { status: 500 }
        );
    }
}
