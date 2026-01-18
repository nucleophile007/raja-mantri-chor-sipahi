import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { broadcastImposterAction } from '@/lib/pusher';

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

        const player = game.players.find(p => p.id === playerId);
        if (!player || !player.isActive) {
            return NextResponse.json(
                { error: 'Player not found or not active' },
                { status: 404 }
            );
        }

        // Only allow back to lobby from RESULT status
        // OR if Host has already reset it to WAITING
        if (game.gameStatus !== 'RESULT' && !(game.gameStatus === 'WAITING' && game.hostInLobby)) {
            return NextResponse.json(
                { error: 'Can only return to lobby after game ends or when host is in lobby' },
                { status: 400 }
            );
        }

        const isHost = player.isHost;

        // HOST clicks "Back to Lobby"
        if (isHost) {
            // Clear all game data and return to lobby
            game.gameStatus = 'WAITING';
            game.word = null;          // Clear secret word
            game.imposterId = null;    // Clear imposter
            game.votes = [];           // Clear votes
            game.result = null;
            game.endReason = null;
            game.endedAt = null;
            game.hostInLobby = true;

            // Reset all players' states
            game.players = game.players.map(p => ({
                ...p,
                hasScratched: false,
                hasVoted: false,
                isInLobby: p.id === playerId ? true : false // Only host is in lobby initially
            }));

            await updateImposterGame(gameToken, game);

            // Broadcast HOST_IN_LOBBY - tells others they can now click their button
            await broadcastImposterAction(gameToken, {
                type: 'HOST_IN_LOBBY'
            });

            // Also broadcast that host entered lobby (for UI update)
            await broadcastImposterAction(gameToken, {
                type: 'PLAYER_ENTERED_LOBBY',
                playerName: player.name
            });

            return NextResponse.json({
                success: true,
                inLobby: true,
                message: 'You are now in the lobby. Waiting for other players to join.'
            });
        }

        // NON-HOST clicks "Back to Lobby"
        // Check if host is in lobby first
        if (!game.hostInLobby) {
            return NextResponse.json({
                success: false,
                error: 'Waiting for host to return to lobby first',
                waitingForHost: true
            });
        }

        // Mark player as in lobby
        game.players = game.players.map(p =>
            p.id === playerId ? { ...p, isInLobby: true } : p
        );

        await updateImposterGame(gameToken, game);

        // Broadcast that this player has entered the lobby
        await broadcastImposterAction(gameToken, {
            type: 'PLAYER_ENTERED_LOBBY',
            playerName: player.name
        });

        return NextResponse.json({
            success: true,
            inLobby: true,
            message: 'Welcome to the lobby!'
        });

    } catch (error) {
        console.error('Error returning to lobby:', error);
        return NextResponse.json(
            { error: 'Failed to return to lobby' },
            { status: 500 }
        );
    }
}
