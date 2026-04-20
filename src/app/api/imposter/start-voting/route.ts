import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { toClientState } from '@/lib/imposterLogic';
import { broadcastImposterUpdate, broadcastImposterAction } from '@/lib/pusher';
import { getSessionCredentials } from '@/lib/imposterSession';

export async function POST(request: NextRequest) {
    try {
        let body: { gameToken?: string; playerId?: string; force?: boolean } | null = null;
        try {
            body = await request.json();
        } catch {
            // Allow header/cookie driven auth for mobile
        }

        const { gameToken, playerId } = getSessionCredentials(request, body);
        const force = Boolean(body?.force);

        if (!gameToken || !playerId) {
            return NextResponse.json(
                { success: false, error: 'Game token and player ID are required' },
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
                { success: false, error: 'Only host can start voting' },
                { status: 403 }
            );
        }

        if (game.gameStatus !== 'DISCUSSION') {
            // Allow force start from SCRATCHING or CARDS_DEALT if host requests it
            if (force && (game.gameStatus === 'SCRATCHING' || game.gameStatus === 'CARDS_DEALT')) {
                console.log('⚠️ Force starting voting from', game.gameStatus);
            } else {
                return NextResponse.json(
                    { success: false, error: 'Voting can only be started during discussion phase' },
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

        // Broadcast to all players using modern explicit action for Native Mobile Apps
        await broadcastImposterAction(gameToken, {
            type: 'GAME_STARTED',
            status: 'VOTING',
            votingStartedAt: game.votingStartedAt,
            votingTimeout: game.votingTimeout || 120,
        } as any);

        // Also broadcast legacy full update
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
            { success: false, error: 'Failed to start voting' },
            { status: 500 }
        );
    }
}
