import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { toClientState } from '@/lib/imposterLogic';
import { broadcastImposterUpdate } from '@/lib/pusher';

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
                { error: 'Only host can start voting' },
                { status: 403 }
            );
        }

        if (game.gameStatus !== 'DISCUSSION') {
            const { force } = await request.json().catch(() => ({}));

            // Allow force start from SCRATCHING or CARDS_DEALT if host requests it
            if (force && (game.gameStatus === 'SCRATCHING' || game.gameStatus === 'CARDS_DEALT')) {
                console.log('⚠️ Force starting voting from', game.gameStatus);
            } else {
                return NextResponse.json(
                    { error: 'Voting can only be started during discussion phase' },
                    { status: 400 }
                );
            }
        }

        // Start voting
        game.gameStatus = 'VOTING';
        game.votes = [];
        game.votingStartedAt = Date.now(); // Set start time for countdown

        // Reset vote flags
        game.players = game.players.map(p => ({
            ...p,
            hasVoted: false
        }));

        await updateImposterGame(gameToken, game);

        // Broadcast to all players
        for (const p of game.players.filter(pl => pl.isActive)) {
            const clientState = toClientState(game, p.id);
            await broadcastImposterUpdate(gameToken, clientState);
        }

        return NextResponse.json({
            success: true,
            message: 'Voting has started!'
        });
    } catch (error) {
        console.error('Error starting voting:', error);
        return NextResponse.json(
            { error: 'Failed to start voting' },
            { status: 500 }
        );
    }
}
