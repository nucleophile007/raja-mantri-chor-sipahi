import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ImposterPlayer } from '@/types/imposter';
import { withGameLock } from '@/lib/imposterStorage';
import { MAX_PLAYERS } from '@/lib/imposterLogic';
import { broadcastImposterAction } from '@/lib/pusher';
import { validateRequestSession } from '@/lib/imposterSession';

interface JoinResult {
    newPlayer: ImposterPlayer;
    playerId: string;
}

export async function POST(request: NextRequest) {
    try {
        // Enforce Single Session (Check before locking)
        const { hasActiveSession, error: sessionError } = await validateRequestSession(request);
        if (hasActiveSession) {
            return NextResponse.json({ error: sessionError }, { status: 403 });
        }

        const { gameToken, playerName } = await request.json();

        if (!gameToken || !playerName) {
            return NextResponse.json({ error: 'Game token and player name are required' }, { status: 400 });
        }

        if (playerName.length > 20) {
            return NextResponse.json({ error: 'Player name must be 20 characters or less' }, { status: 400 });
        }

        const result = await withGameLock<JoinResult>(gameToken, async (game) => {
            if (game.gameStatus !== 'WAITING') throw new Error('Game has already started');

            const activePlayers = game.players.filter(p => p.isActive);
            if (activePlayers.length >= MAX_PLAYERS) throw new Error(`Game is full (max ${MAX_PLAYERS} players)`);

            const nameExists = game.players.some(
                p => p.isActive && p.name.toLowerCase() === playerName.trim().toLowerCase()
            );
            if (nameExists) throw new Error('A player with this name already exists');

            const playerId = uuidv4();
            const newPlayer: ImposterPlayer = {
                id: playerId,
                name: playerName.trim(),
                isHost: false,
                isActive: true,
                hasScratched: false,
                hasVoted: false,
                isInLobby: true,
                joinedAt: Date.now()
            };

            game.players.push(newPlayer);

            return { game, result: { newPlayer, playerId } };
        });

        if (!result) return NextResponse.json({ error: 'Game not found or lock failed' }, { status: 404 });

        const { newPlayer, playerId } = result;

        // Broadcast action for instant UI update
        // We broadcast OUTSIDE the lock to reduce lock contention time, safe because we already committed
        await broadcastImposterAction(gameToken, {
            type: 'PLAYER_JOINED',
            playerName: newPlayer.name,
            isHost: false
        });

        const response = NextResponse.json({
            success: true,
            gameToken: gameToken.toUpperCase(), // Normalize token
            playerId,
            playerName: newPlayer.name
        });

        // Set session cookie
        response.cookies.set('imposter_session', JSON.stringify({ gameToken, playerId }), {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        return response;

    } catch (error: any) {
        console.error('Error joining Imposter game:', error);
        return NextResponse.json({ error: error.message || 'Failed to join game' }, { status: 500 });
    }
}
