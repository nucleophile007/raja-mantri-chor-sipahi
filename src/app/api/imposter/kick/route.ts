import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame, updateImposterGame } from '@/lib/imposterStorage';
import { pusherServer } from '@/lib/pusher';
import { ImposterGameAction } from '@/types/imposter';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { gameToken, playerId, targetPlayerId, targetPlayerName } = body;

        if (!gameToken || !playerId || (!targetPlayerId && !targetPlayerName)) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get current game state
        const game = await getImposterGame(gameToken);
        if (!game) {
            return NextResponse.json(
                { error: 'Game not found' },
                { status: 404 }
            );
        }

        // Verify requester is host
        const requester = game.players.find(p => p.id === playerId);
        if (!requester || !requester.isHost) {
            return NextResponse.json(
                { error: 'Only the host can kick players' },
                { status: 403 }
            );
        }

        // Verify game is in WAITING state (Lobby)
        if (game.gameStatus !== 'WAITING') {
            return NextResponse.json(
                { error: 'Cannot kick players once the game has started' },
                { status: 400 }
            );
        }

        // Find target player
        let targetPlayerIndex = -1;
        if (targetPlayerId) {
            targetPlayerIndex = game.players.findIndex(p => p.id === targetPlayerId);
        } else if (targetPlayerName) {
            targetPlayerIndex = game.players.findIndex(p => p.name === targetPlayerName);
        }

        if (targetPlayerIndex === -1) {
            return NextResponse.json(
                { error: 'Target player not found' },
                { status: 404 }
            );
        }

        const targetPlayer = game.players[targetPlayerIndex];

        // Prevent kicking the host (requester)
        if (targetPlayer.isHost) {
            return NextResponse.json(
                { error: 'You cannot kick the host' },
                { status: 400 }
            );
        }

        // Remove the player
        game.players.splice(targetPlayerIndex, 1);

        // Update game in Redis
        await updateImposterGame(game.gameToken, game);

        // Notify client via Pusher
        const action: ImposterGameAction = {
            type: 'PLAYER_KICKED',
            kickedPlayerId: targetPlayer.id,
            kickedPlayerName: targetPlayer.name
        };

        await pusherServer.trigger(`imposter-${gameToken}`, 'game-action', action);

        return NextResponse.json({
            success: true,
            message: `Player ${targetPlayer.name} kicked successfully`
        });

    } catch (error) {
        console.error('Error kicking player:', error);
        return NextResponse.json(
            { error: 'Failed to kick player' },
            { status: 500 }
        );
    }
}
