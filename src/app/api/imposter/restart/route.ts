import { NextRequest, NextResponse } from 'next/server';
import { withGameLock } from '@/lib/imposterStorage';
import { broadcastImposterAction } from '@/lib/pusher';
import { ImposterPlayer } from '@/types/imposter';

interface RestartResult {
    isHost: boolean;
    player: ImposterPlayer;
    waitingForHost?: boolean;
    inLobby?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const { gameToken, playerId } = await request.json();

        if (!gameToken || !playerId) {
            return NextResponse.json({ error: 'Game token and player ID are required' }, { status: 400 });
        }

        const result = await withGameLock<RestartResult>(gameToken, async (game) => {
            const player = game.players.find(p => p.id === playerId);
            if (!player || !player.isActive) throw new Error('Player not found or not active');

            // Only allow back to lobby from RESULT status or when host is already there
            if (game.gameStatus !== 'RESULT' && !(game.gameStatus === 'WAITING' && game.hostInLobby)) {
                throw new Error('Can only return to lobby after game ends or when host is in lobby');
            }

            const isHost = player.isHost;

            if (isHost) {
                // HOST: Reset everything
                game.gameStatus = 'WAITING';
                game.word = null;
                game.imposterId = null;
                game.votes = [];
                game.result = null;
                game.endReason = null;
                game.endedAt = null;
                game.hostInLobby = true;

                // Reset players
                game.players = game.players.map(p => ({
                    ...p,
                    hasScratched: false,
                    hasVoted: false,
                    isInLobby: p.id === playerId ? true : false, // Only host enters lobby automatically here
                    isHost: p.id === player.id // Ensure host role sticks
                }));

                return { game, result: { isHost: true, player } };
            } else {
                // NON-HOST
                if (!game.hostInLobby) {
                    return { game, result: { isHost: false, waitingForHost: true, player } };
                }

                // Enter lobby
                game.players = game.players.map(p =>
                    p.id === playerId ? { ...p, isInLobby: true } : p
                );

                return { game, result: { isHost: false, inLobby: true, player } };
            }
        });

        if (!result) return NextResponse.json({ error: 'Game not found or lock failed' }, { status: 404 });

        const { isHost, waitingForHost, inLobby, player } = result;

        if (waitingForHost) {
            return NextResponse.json({
                success: false,
                error: 'Waiting for host to return to lobby first',
                waitingForHost: true
            });
        }

        if (isHost) {
            // Broadcast HOST_IN_LOBBY
            await broadcastImposterAction(gameToken, { type: 'HOST_IN_LOBBY' });

            // Broadcast Host entered
            await broadcastImposterAction(gameToken, {
                type: 'PLAYER_ENTERED_LOBBY',
                playerName: player.name
            });

            return NextResponse.json({
                success: true,
                inLobby: true,
                message: 'You are now in the lobby.'
            });
        }

        if (inLobby) {
            await broadcastImposterAction(gameToken, {
                type: 'PLAYER_ENTERED_LOBBY',
                playerName: player.name
            });

            return NextResponse.json({
                success: true,
                inLobby: true,
                message: 'Welcome to the lobby!'
            });
        }

        return NextResponse.json({ success: false, error: 'Unknown state' });

    } catch (error: any) {
        console.error('Error returning to lobby:', error);
        return NextResponse.json({ error: error.message || 'Failed to return to lobby' }, { status: 500 });
    }
}
