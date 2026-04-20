import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { getSessionCredentials } from '@/lib/imposterSession';

export async function POST(request: NextRequest) {
    try {
        let body: { gameToken?: string; playerId?: string; votingTimeout?: number } | null = null;
        try {
            body = await request.json();
        } catch {
            // Allow header/cookie driven auth for mobile
        }

        const { gameToken, playerId } = getSessionCredentials(request, body);
        const votingTimeout = body?.votingTimeout;

        if (!gameToken || !playerId || votingTimeout === undefined) {
            return NextResponse.json(
                { success: false, error: 'Game token, player ID, and voting timeout are required' },
                { status: 400 }
            );
        }

        // Validate timeout range (30-180 seconds)
        if (votingTimeout < 30 || votingTimeout > 180) {
            return NextResponse.json(
                { success: false, error: 'Voting timeout must be between 30 and 180 seconds' },
                { status: 400 }
            );
        }

        const game = await getImposterGame(gameToken);

        if (!game) {
            return NextResponse.json(
                { success: false, error: 'Game not found' },
                { status: 404 }
            );
        }

        // Check if player is host
        const player = game.players.find(p => p.id === playerId);
        if (!player?.isHost) {
            return NextResponse.json(
                { success: false, error: 'Only host can change timeout' },
                { status: 403 }
            );
        }

        // Only allow changing in WAITING state
        if (game.gameStatus !== 'WAITING') {
            return NextResponse.json(
                { success: false, error: 'Can only change timeout in lobby' },
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
            { success: false, error: 'Failed to update timeout' },
            { status: 500 }
        );
    }
}
