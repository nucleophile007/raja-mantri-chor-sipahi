import { NextRequest } from 'next/server';
import { getImposterGame } from './imposterStorage';

interface SessionPayload {
    gameToken?: string;
    playerId?: string;
}

function normalizeToken(token: string | null | undefined): string | null {
    if (!token) return null;
    const cleaned = token.trim();
    return cleaned ? cleaned.toUpperCase() : null;
}

function normalizePlayerId(playerId: string | null | undefined): string | null {
    if (!playerId) return null;
    const cleaned = playerId.trim();
    return cleaned || null;
}

function readSessionCookie(request: NextRequest): SessionPayload {
    const sessionCookie = request.cookies.get('imposter_session');
    if (!sessionCookie) return {};

    try {
        const parsed = JSON.parse(sessionCookie.value) as SessionPayload;
        return parsed;
    } catch {
        return {};
    }
}

export function getSessionCredentials(
    request: NextRequest,
    body?: SessionPayload | null
): { gameToken: string | null; playerId: string | null; source: 'body' | 'headers' | 'cookie' | 'none' } {
    const bodyToken = normalizeToken(body?.gameToken);
    const bodyPlayerId = normalizePlayerId(body?.playerId);
    if (bodyToken && bodyPlayerId) {
        return { gameToken: bodyToken, playerId: bodyPlayerId, source: 'body' };
    }

    const headerToken = normalizeToken(request.headers.get('x-game-token'));
    const headerPlayerId = normalizePlayerId(request.headers.get('x-player-id'));
    if (headerToken && headerPlayerId) {
        return { gameToken: headerToken, playerId: headerPlayerId, source: 'headers' };
    }

    const sessionCookie = readSessionCookie(request);
    const cookieToken = normalizeToken(sessionCookie.gameToken);
    const cookiePlayerId = normalizePlayerId(sessionCookie.playerId);
    if (cookieToken && cookiePlayerId) {
        return { gameToken: cookieToken, playerId: cookiePlayerId, source: 'cookie' };
    }

    return { gameToken: null, playerId: null, source: 'none' };
}

export async function validateRequestSession(
    request: NextRequest,
    body?: SessionPayload | null
): Promise<{ hasActiveSession: boolean; error?: string }> {
    const { gameToken, playerId } = getSessionCredentials(request, body);
    if (!gameToken || !playerId) return { hasActiveSession: false };

    try {
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
    } catch {
        return { hasActiveSession: false };
    }
}
