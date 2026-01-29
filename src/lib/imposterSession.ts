import { NextRequest } from 'next/server';
import { getImposterGame } from './imposterStorage';

export async function validateRequestSession(request: NextRequest): Promise<{ hasActiveSession: boolean; error?: string }> {
    const sessionCookie = request.cookies.get('imposter_session');
    if (!sessionCookie) return { hasActiveSession: false };

    try {
        const { gameToken, playerId } = JSON.parse(sessionCookie.value);
        if (!gameToken || !playerId) return { hasActiveSession: false };

        const game = await getImposterGame(gameToken);
        if (!game) return { hasActiveSession: false }; // Game doesn't exist

        // If game is over, session is invalid
        if (game.gameStatus === 'RESULT') return { hasActiveSession: false };

        // Check if player is actually in the game
        const player = game.players.find(p => p.id === playerId);

        // If player not found (kicked) or inactive (left), session is invalid
        if (!player || !player.isActive) return { hasActiveSession: false };

        // Active session found!
        return {
            hasActiveSession: true,
            error: `You are already in game ${gameToken}. Please leave that game first.`
        };
    } catch (e) {
        return { hasActiveSession: false };
    }
}
