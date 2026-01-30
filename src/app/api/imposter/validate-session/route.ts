import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame } from '@/lib/imposterStorage';

export async function POST(request: NextRequest) {
    try {
        let playerId: string | undefined;
        let gameToken: string | null = null;

        // Try reading from JSON body
        try {
            const body = await request.json();
            playerId = body.playerId;
            gameToken = body.gameToken;
        } catch (e) {
            // Body might be empty
        }

        // Fallback to headers
        if (!gameToken) {
            gameToken = request.headers.get('x-game-token');
        }

        // Fallback to Cookie (Auto-recovery of session)
        if (!gameToken || !playerId) {
            const sessionCookie = request.cookies.get('imposter_session');
            if (sessionCookie) {
                try {
                    const sessionData = JSON.parse(sessionCookie.value);
                    gameToken = sessionData.gameToken;
                    playerId = sessionData.playerId;
                } catch (e) {
                    // Invalid cookie
                }
            }
        }

        if (!gameToken || !playerId) {
            return NextResponse.json({
                hasSession: false,
                valid: false, // Legacy support
                currentGame: null
            });
        }

        const game = await getImposterGame(gameToken);

        if (!game) {
            return NextResponse.json({
                hasSession: false,
                valid: false,
                currentGame: null
            });
        }

        const player = game.players.find(p => p.id === playerId);

        // Allow 'WAITING' (Lobby), 'PLAYING', 'VOTING' etc.
        // If game is 'RESULT', usually session is over, but let's check isActive
        // Only return if player is properly in the game
        if (!player || !player.isActive || game.gameStatus === 'RESULT') {
            return NextResponse.json({
                hasSession: false,
                valid: false,
                currentGame: null
            });
        }

        return NextResponse.json({
            hasSession: true,
            valid: true, // Legacy field
            gameToken: game.gameToken, // Top level for easy access
            playerName: player.name,
            playerId: player.id, // Return ID to allow client to heal localStorage
            isHost: player.isHost,
            currentGame: {
                gameToken: game.gameToken,
                playerName: player.name,
                gameStatus: game.gameStatus,
                isHost: player.isHost,
                playerCount: game.players.filter(p => p.isActive).length
            }
        });
    } catch (error) {
        console.error('Error validating Imposter session:', error);
        return NextResponse.json({
            hasSession: false,
            valid: false,
            currentGame: null
        });
    }
}
