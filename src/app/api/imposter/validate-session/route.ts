import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame } from '@/lib/imposterStorage';

export async function POST(request: NextRequest) {
    try {
        const { playerId } = await request.json();
        const gameToken = request.headers.get('x-game-token');

        if (!gameToken || !playerId) {
            return NextResponse.json({
                hasSession: false,
                currentGame: null
            });
        }

        const game = await getImposterGame(gameToken);

        if (!game) {
            return NextResponse.json({
                hasSession: false,
                currentGame: null
            });
        }

        const player = game.players.find(p => p.id === playerId);

        if (!player || !player.isActive) {
            return NextResponse.json({
                hasSession: false,
                currentGame: null
            });
        }

        // Game ended - session no longer valid
        if (game.gameStatus === 'RESULT') {
            return NextResponse.json({
                hasSession: false,
                currentGame: null
            });
        }

        return NextResponse.json({
            hasSession: true,
            currentGame: {
                gameToken: game.gameToken,
                playerName: player.name,
                gameStatus: game.gameStatus,
                isHost: player.isHost,
                playerCount: game.players.filter(p => p.isActive).length
            }
        });
    } catch (error) {
        console.error('Error validating Imposter session:', error);
        return NextResponse.json({
            hasSession: false,
            currentGame: null
        });
    }
}
