import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame } from '@/lib/imposterStorage';
import { toClientState } from '@/lib/imposterLogic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const gameToken = searchParams.get('gameToken');
        const playerId = searchParams.get('playerId');

        if (!gameToken) {
            return NextResponse.json(
                { error: 'Game token is required' },
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

        // If playerId provided, return personalized state
        if (playerId) {
            const player = game.players.find(p => p.id === playerId);
            if (!player) {
                return NextResponse.json(
                    { error: 'Player not found in game' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                success: true,
                gameState: toClientState(game, playerId)
            });
        }

        // If no playerId, return basic game info (for join page preview)
        return NextResponse.json({
            success: true,
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
            { error: 'Failed to fetch game state' },
            { status: 500 }
        );
    }
}
