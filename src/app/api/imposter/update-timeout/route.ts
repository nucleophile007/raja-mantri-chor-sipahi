import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId, votingTimeout } = await request.json();

        if (!gameToken || !playerId || votingTimeout === undefined) {
            return NextResponse.json(
                { error: 'Game token, player ID, and voting timeout are required' },
                { status: 400 }
            );
        }

        // Validate timeout range (30-180 seconds)
        if (votingTimeout < 30 || votingTimeout > 180) {
            return NextResponse.json(
                { error: 'Voting timeout must be between 30 and 180 seconds' },
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
                { error: 'Only host can change timeout' },
                { status: 403 }
            );
        }

        // Only allow changing in WAITING state
        if (game.gameStatus !== 'WAITING') {
            return NextResponse.json(
                { error: 'Can only change timeout in lobby' },
                { status: 400 }
            );
        }

        game.votingTimeout = votingTimeout;
        await updateImposterGame(gameToken, game);

        return NextResponse.json({
            success: true,
            votingTimeout
        });
    } catch (error) {
        console.error('Error updating voting timeout:', error);
        return NextResponse.json(
            { error: 'Failed to update timeout' },
            { status: 500 }
        );
    }
}
