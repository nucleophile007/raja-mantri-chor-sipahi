// Imposter Game Storage - Redis operations with 'imposter:' prefix

import { Redis } from '@upstash/redis';
import { ImposterGame } from '@/types/imposter';
import { pusherServer } from '@/lib/pusher';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const GAME_PREFIX = 'imposter:';
const GAME_EXPIRY = 60 * 60 * 24; // Valid for 24 hours

// Generate a clean 6-character token
export function generateImposterToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed characters that look confusing (I, 1, O, 0)
    let token = '';
    for (let i = 0; i < 6; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// Check real-time presence via Pusher API
export async function getOnlinePlayers(gameToken: string, playerIds: string[]): Promise<string[]> {
    try {
        const channelName = `presence-imposter-${gameToken}`;
        // Fetch users from Pusher
        const response = await pusherServer.get({ path: `/channels/${channelName}/users` });

        if (response.status === 200) {
            const data = await response.json();
            const users = data.users as Array<{ id: string }>;
            const onlineSet = new Set(users.map(u => u.id));
            return playerIds.filter(id => onlineSet.has(id));
        }
        return [];
    } catch (e) {
        console.error('Failed to fetch Pusher presence:', e);
        return playerIds; // Fallback to avoid blocking on error
    }
}

// Create a brand new Imposter game
export async function createImposterGame(game: ImposterGame): Promise<void> {
    const key = `${GAME_PREFIX}${game.gameToken}`;
    await redis.set(key, JSON.stringify(game), { ex: GAME_EXPIRY });
}

// Find the game using the token
export async function getImposterGame(gameToken: string): Promise<ImposterGame | null> {
    const key = `${GAME_PREFIX}${gameToken.toUpperCase()}`;
    const data = await redis.get(key);

    if (!data) return null;

    if (typeof data === 'string') {
        return JSON.parse(data) as ImposterGame;
    }
    return data as ImposterGame;
}

// Update game state in Redis
export async function updateImposterGame(gameToken: string, game: ImposterGame): Promise<void> {
    const key = `${GAME_PREFIX}${gameToken.toUpperCase()}`;
    await redis.set(key, JSON.stringify(game), { ex: GAME_EXPIRY });
}

// Delete the game from Redis
export async function deleteImposterGame(gameToken: string): Promise<void> {
    const key = `${GAME_PREFIX}${gameToken.toUpperCase()}`;
    await redis.del(key);
}

// Check if this token already exists in the market
export async function imposterTokenExists(gameToken: string): Promise<boolean> {
    const key = `${GAME_PREFIX}${gameToken.toUpperCase()}`;
    const exists = await redis.exists(key);
    return exists === 1;
}

// Get a completely unique token
export async function generateUniqueImposterToken(): Promise<string> {
    let token = generateImposterToken();
    let attempts = 0;

    while (await imposterTokenExists(token) && attempts < 10) {
        token = generateImposterToken();
        attempts++;
    }

    return token;
}


// Helper for spinlock to ensure atomic updates with "Enterprise Level" reliability
// Retries heavily to ensure we "get the request again" if we miss the lock initially.
async function acquireLock(gameToken: string, retries = 25): Promise<boolean> {
    const lockKey = `${GAME_PREFIX}lock:${gameToken}`;
    for (let i = 0; i < retries; i++) {
        // SET NX (Not Exists) with 5 second expiry (auto-release safety net)
        const acquired = await redis.set(lockKey, 'LOCKED', { nx: true, ex: 5 });
        if (acquired) return true;

        // Exponential-ish backoff with jitter
        // Base wait increases slightly, plus random jitter to prevent thundering herd
        // Range: 20ms to ~150ms per try. Total max wait time: ~2-3 seconds.
        const baseWait = 20 + (i * 2);
        const jitter = Math.random() * 80;
        await new Promise(r => setTimeout(r, baseWait + jitter));
    }
    return false;
}

async function releaseLock(gameToken: string): Promise<void> {
    const lockKey = `${GAME_PREFIX}lock:${gameToken}`;
    try {
        await redis.del(lockKey);
    } catch (e) {
        console.error('Failed to release lock (TTL will expire it):', e);
    }
}

// Wrapper to safely modify game state with a lock
export async function withGameLock<T>(
    gameToken: string,
    operation: (game: ImposterGame) => Promise<{ game: ImposterGame, result: T } | null>
): Promise<T | null> {
    const locked = await acquireLock(gameToken);
    if (!locked) throw new Error('Could not acquire game lock - system busy');

    try {
        const game = await getImposterGame(gameToken);
        if (!game) return null;

        const output = await operation(game);
        if (output) {
            await updateImposterGame(gameToken, output.game);
            return output.result;
        }
        return null;
    } finally {
        await releaseLock(gameToken);
    }
}
