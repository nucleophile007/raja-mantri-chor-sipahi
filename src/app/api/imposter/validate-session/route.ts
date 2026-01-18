import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame } from '@/lib/imposterStorage';

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId } = await request.json();

        if (!gameToken || !playerId) {
            return NextResponse.json({ valid: false });
        }

        const game = await getImposterGame(gameToken);

        if (!game) {
            return NextResponse.json({ valid: false });
        }

        const player = game.players.find(p => p.id === playerId);

        if (!player || !player.isActive) {
            return NextResponse.json({ valid: false });
        }

        // Game ended - session no longer valid
        if (game.gameStatus === 'RESULT') {
            return NextResponse.json({ valid: false });
        }

        return NextResponse.json({
            valid: true,
            gameToken: game.gameToken,
            playerId: player.id,
            playerName: player.name,
            isHost: player.isHost,
            gameStatus: game.gameStatus,
            playerCount: game.players.filter(p => p.isActive).length
        });
    } catch (error) {
        console.error('Error validating Imposter session:', error);
        return NextResponse.json({ valid: false });
    }
}
