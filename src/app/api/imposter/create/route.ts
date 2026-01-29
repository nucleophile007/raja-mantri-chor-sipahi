import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ImposterGame, ImposterPlayer } from '@/types/imposter';
import { createImposterGame, generateUniqueImposterToken } from '@/lib/imposterStorage';
import { validateRequestSession } from '@/lib/imposterSession';

export async function POST(request: NextRequest) {
    try {
        // 1. Enforce Single Session
        const { hasActiveSession, error: sessionError } = await validateRequestSession(request);
        if (hasActiveSession) {
            return NextResponse.json(
                { error: sessionError },
                { status: 403 }
            );
        }

        const { playerName } = await request.json();

        if (!playerName || playerName.trim().length === 0) {
            return NextResponse.json(
                { error: 'Player name is required' },
                { status: 400 }
            );
        }

        if (playerName.length > 20) {
            return NextResponse.json(
                { error: 'Player name must be 20 characters or less' },
                { status: 400 }
            );
        }

        const gameToken = await generateUniqueImposterToken();
        const playerId = uuidv4();

        const host: ImposterPlayer = {
            id: playerId,
            name: playerName.trim(),
            isHost: true,
            isActive: true,
            hasScratched: false,
            hasVoted: false,
            isInLobby: true,
            joinedAt: Date.now()
        };

        const game: ImposterGame = {
            gameToken,
            hostId: playerId,
            players: [host],
            gameStatus: 'WAITING',
            word: null,
            imposterId: null,
            votes: [],
            result: null,
            createdAt: Date.now(),
            endedAt: null,
            endReason: null,
            hostInLobby: true,  // Host stays in the lobby while creating the game
            votingTimeout: 120, // Default 2 minutes voting time
            votingStartedAt: null
        };

        await createImposterGame(game);

        const response = NextResponse.json({
            success: true,
            gameToken,
            playerId,
            playerName: host.name
        });

        // Set session cookie
        response.cookies.set('imposter_session', JSON.stringify({ gameToken, playerId }), {
            httpOnly: true,
            path: '/',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        return response;

    } catch (error) {
        console.error('Error creating Imposter game:', error);
        return NextResponse.json(
            { error: 'Failed to create game' },
            { status: 500 }
        );
    }
}
