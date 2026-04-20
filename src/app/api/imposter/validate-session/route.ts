import { NextRequest, NextResponse } from 'next/server';
import { getImposterGame } from '@/lib/imposterStorage';
import { getSessionCredentials } from '@/lib/imposterSession';

export async function POST(request: NextRequest) {
    try {
        let body: { playerId?: string; gameToken?: string } | null = null;

        // Try reading from JSON body
        try {
            body = await request.json();
        } catch {
            // Body might be empty
        }

        const { gameToken, playerId, source } = getSessionCredentials(request, body);

        if (!gameToken || !playerId) {
            return NextResponse.json({
                hasSession: false,
                valid: false, // Legacy support
                currentGame: null,
                source: 'none'
            });
        }

        const game = await getImposterGame(gameToken);

        if (!game) {
            return NextResponse.json({
                hasSession: false,
                valid: false,
                currentGame: null,
                source
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
                currentGame: null,
                source
            });
        }

        return NextResponse.json({
            hasSession: true,
            valid: true, // Legacy field
            source,
            gameToken: game.gameToken, // Top level for easy access
            playerName: player.name,
            playerId: player.id, // Return ID to allow client to heal localStorage
            isHost: player.isHost,
            session: {
                gameToken: game.gameToken,
                playerId: player.id,
                expiresInSeconds: 60 * 60 * 24,
                transport: 'header-or-body'
            },
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
            currentGame: null,
            source: 'none'
        });
    }
}
