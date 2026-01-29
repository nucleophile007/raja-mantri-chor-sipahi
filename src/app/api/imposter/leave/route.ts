import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame, deleteImposterGame } from '@/lib/imposterStorage';
import { checkGameEndCondition, transferHost, toClientState } from '@/lib/imposterLogic';
import { broadcastImposterUpdate, broadcastImposterAction } from '@/lib/pusher';

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
        if (!player) {
            return NextResponse.json(
                { error: 'Player not found' },
                { status: 404 }
            );
        }

        const wasHost = player.isHost;
        const wasImposter = game.imposterId === playerId;
        const gameInProgress = game.gameStatus !== 'WAITING' && game.gameStatus !== 'RESULT';

        // Check if game should end
        const { shouldEnd, result, reason } = checkGameEndCondition(game, playerId);

        if (shouldEnd && gameInProgress) {
            // Game ends due to this player leaving
            game.gameStatus = 'RESULT';
            game.result = result;
            game.endReason = reason;
            game.endedAt = Date.now();

            // Mark player as inactive
            game.players = game.players.map(p =>
                p.id === playerId ? { ...p, isActive: false } : p
            );

            await updateImposterGame(gameToken, game);

            // Broadcast game end to all remaining players
            for (const p of game.players.filter(pl => pl.isActive)) {
                const clientState = toClientState(game, p.id);
                await broadcastImposterUpdate(gameToken, clientState);
            }

            return NextResponse.json({
                success: true,
                gameEnded: true,
                reason
            });
        }

        // Game continues - handle host transfer if needed
        if (wasHost && !wasImposter) {
            game.players = transferHost(game.players, playerId);
        }

        // Mark player as inactive
        game.players = game.players.map(p =>
            p.id === playerId ? { ...p, isActive: false, isHost: false } : p
        );

        // If in waiting room and no active players, delete game
        const activePlayers = game.players.filter(p => p.isActive);
        if (activePlayers.length === 0) {
            await deleteImposterGame(gameToken);
            const response = NextResponse.json({
                success: true,
                gameDeleted: true
            });
            response.cookies.delete('imposter_session');
            return response;
        }

        await updateImposterGame(gameToken, game);

        // Broadcast action for instant UI update
        // If host changed, we need to send the new host's name
        const newHost = wasHost ? game.players.find(p => p.isHost) : null;

        await broadcastImposterAction(gameToken, {
            type: 'PLAYER_LEFT',
            playerName: player.name,
            newHostName: newHost?.name
        });

        const response = NextResponse.json({
            success: true,
            gameEnded: false
        });
        response.cookies.delete('imposter_session');
        return response;

    } catch (error) {
        console.error('Error leaving Imposter game:', error);
        return NextResponse.json(
            { error: 'Failed to leave game' },
            { status: 500 }
        );
    }
}
