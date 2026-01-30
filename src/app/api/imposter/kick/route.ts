import { NextRequest, NextResponse } from 'next/server';
import { withGameLock } from '@/lib/imposterStorage';
import { pusherServer } from '@/lib/pusher';
import { ImposterGameAction, ImposterPlayer } from '@/types/imposter';

interface KickResult {
    kickedPlayer: ImposterPlayer;
}

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

        const result = await withGameLock<KickResult>(gameToken, async (game) => {
            // Verify requester is host
            const requester = game.players.find(p => p.id === playerId);
            if (!requester || !requester.isHost) {
                throw new Error('Only the host can kick players');
            }

            // Verify game is in WAITING state (Lobby)
            if (game.gameStatus !== 'WAITING') {
                throw new Error('Cannot kick players once the game has started');
            }

            // Find target player
            let targetPlayerIndex = -1;
            if (targetPlayerId) {
                targetPlayerIndex = game.players.findIndex(p => p.id === targetPlayerId);
            } else if (targetPlayerName) {
                targetPlayerIndex = game.players.findIndex(p => p.name === targetPlayerName);
            }

            if (targetPlayerIndex === -1) {
                throw new Error('Target player not found');
            }

            const targetPlayer = game.players[targetPlayerIndex];

            // Prevent kicking the host (requester)
            if (targetPlayer.isHost) {
                throw new Error('You cannot kick the host');
            }

            // Remove the player
            game.players.splice(targetPlayerIndex, 1);

            return { game, result: { kickedPlayer: targetPlayer } };
        });

        if (!result) {
            return NextResponse.json(
                { error: 'Game not found or lock failed' },
                { status: 404 }
            );
        }

        const { kickedPlayer } = result;

        // Notify client via Pusher
        const action: ImposterGameAction = {
            type: 'PLAYER_KICKED',
            kickedPlayerId: kickedPlayer.id,
            kickedPlayerName: kickedPlayer.name
        };

        await pusherServer.trigger(`imposter-${gameToken}`, 'game-action', action);

        return NextResponse.json({
            success: true,
            message: `Player ${kickedPlayer.name} kicked successfully`
        });

    } catch (error: any) {
        console.error('Error kicking player:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to kick player' },
            { status: error?.message?.includes('found') ? 404 : 400 }
        );
    }
}
