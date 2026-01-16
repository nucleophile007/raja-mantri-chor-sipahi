import { GameState } from '@/types/game';

// Simple in-memory cache to reduce Redis reads
const cache = new Map<string, { data: GameState; timestamp: number }>();
const CACHE_TTL = 1000; // 1 second cache (reduces duplicate reads)

export function getCachedGame(gameToken: string): GameState | null {
  const cached = cache.get(gameToken);
  
  if (!cached) return null;
  
  const now = Date.now();
  const age = now - cached.timestamp;
  
  // Return cached data if less than 1 second old
  if (age < CACHE_TTL) {
    return cached.data;
  }
  
  // Expired, remove from cache
  cache.delete(gameToken);
  return null;
}

export function setCachedGame(gameToken: string, data: GameState): void {
  cache.set(gameToken, {
    data,
    timestamp: Date.now()
  });
  
  // Auto-cleanup old cache entries (every 100 sets)
  if (cache.size > 100) {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL * 2) {
        cache.delete(key);
      }
    }
  }
}

export function invalidateCache(gameToken: string): void {
  cache.delete(gameToken);
}

export function clearCache(): void {
  cache.clear();
}
