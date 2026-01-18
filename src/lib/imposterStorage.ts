// Imposter Game Storage - Redis operations with "imposter:" prefix

import { Redis } from '@upstash/redis';
import { ImposterGame } from '@/types/imposter';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const GAME_PREFIX = 'imposter:';
const GAME_EXPIRY = 60 * 60 * 24; // 24 hours

// Generate a 6-character game token
export function generateImposterToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
    let token = '';
    for (let i = 0; i < 6; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// Create a new Imposter game
export async function createImposterGame(game: ImposterGame): Promise<void> {
    const key = `${GAME_PREFIX}${game.gameToken}`;
    await redis.set(key, JSON.stringify(game), { ex: GAME_EXPIRY });
}

// Get an Imposter game by token
export async function getImposterGame(gameToken: string): Promise<ImposterGame | null> {
    const key = `${GAME_PREFIX}${gameToken.toUpperCase()}`;
    const data = await redis.get(key);

    if (!data) return null;

    if (typeof data === 'string') {
        return JSON.parse(data) as ImposterGame;
    }
    return data as ImposterGame;
}

// Update an Imposter game
export async function updateImposterGame(gameToken: string, game: ImposterGame): Promise<void> {
    const key = `${GAME_PREFIX}${gameToken.toUpperCase()}`;
    await redis.set(key, JSON.stringify(game), { ex: GAME_EXPIRY });
}

// Delete an Imposter game
export async function deleteImposterGame(gameToken: string): Promise<void> {
    const key = `${GAME_PREFIX}${gameToken.toUpperCase()}`;
    await redis.del(key);
}

// Check if token exists
export async function imposterTokenExists(gameToken: string): Promise<boolean> {
    const key = `${GAME_PREFIX}${gameToken.toUpperCase()}`;
    const exists = await redis.exists(key);
    return exists === 1;
}

// Generate unique token
export async function generateUniqueImposterToken(): Promise<string> {
    let token = generateImposterToken();
    let attempts = 0;

    while (await imposterTokenExists(token) && attempts < 10) {
        token = generateImposterToken();
        attempts++;
    }

    return token;
}
