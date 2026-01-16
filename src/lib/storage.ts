import { GameState, Player } from '@/types/game';
import { redis, useInMemoryFallback, inMemoryGames } from './redis';
import { getCachedGame, setCachedGame, invalidateCache } from './cache';

// TTL for games: 24 hours (in seconds)
const GAME_TTL = 24 * 60 * 60;

// Helper function to get Redis key
function getGameKey(gameToken: string): string {
  return `game:${gameToken}`;
}

export async function createGame(
  gameToken: string, 
  hostPlayer: Player, 
  maxRounds: number = 5
): Promise<GameState> {
  const gameState: GameState = {
    gameToken,
    players: [hostPlayer],
    currentRound: 0,
    gameStatus: 'WAITING',
    roundHistory: [],
    maxRounds: maxRounds
  };
  
  if (useInMemoryFallback) {
    inMemoryGames.set(gameToken, gameState);
  } else {
    await redis.set(getGameKey(gameToken), JSON.stringify(gameState), {
      ex: GAME_TTL
    });
  }
  
  // Cache the new game
  setCachedGame(gameToken, gameState);
  
  return gameState;
}

export async function getGame(gameToken: string): Promise<GameState | null> {
  // Check cache first
  const cached = getCachedGame(gameToken);
  if (cached) {
    return cached;
  }
  
  // Fetch from storage
  let gameState: GameState | null;
  
  if (useInMemoryFallback) {
    gameState = inMemoryGames.get(gameToken) || null;
  } else {
    const data = await redis.get(getGameKey(gameToken));
    if (!data) return null;
    gameState = (typeof data === 'string' ? JSON.parse(data) : data) as GameState;
  }
  
  // Cache the result
  if (gameState) {
    setCachedGame(gameToken, gameState);
  }
  
  return gameState;
}

export async function updateGame(gameToken: string, gameState: GameState): Promise<void> {
  // Invalidate cache when updating
  invalidateCache(gameToken);
  
  if (useInMemoryFallback) {
    inMemoryGames.set(gameToken, gameState);
  } else {
    await redis.set(getGameKey(gameToken), JSON.stringify(gameState), {
      ex: GAME_TTL
    });
  }
  
  // Update cache with new data
  setCachedGame(gameToken, gameState);
}

export async function deleteGame(gameToken: string): Promise<void> {
  // Invalidate cache when deleting
  invalidateCache(gameToken);
  
  if (useInMemoryFallback) {
    inMemoryGames.delete(gameToken);
  } else {
    await redis.del(getGameKey(gameToken));
  }
}

export async function addPlayerToGame(gameToken: string, player: Player): Promise<GameState | null> {
  // Use atomic read-modify-write to prevent race condition
  const MAX_RETRIES = 3;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const game = await getGame(gameToken);
    
    if (!game) {
      return null;
    }
    
    if (game.players.length >= 4) {
      return null;
    }
    
    // Check if player already exists (idempotency)
    if (game.players.some(p => p.id === player.id)) {
      return game; // Already added, return success
    }
    
    // Create new game state with added player
    const updatedGame = {
      ...game,
      players: [...game.players, player]
    };
    
    // Atomic check: verify count hasn't changed since we read it
    const currentGame = await getGame(gameToken);
    if (!currentGame || currentGame.players.length !== game.players.length) {
      // State changed, retry
      console.warn(`Race condition detected in addPlayerToGame, retrying (${attempt + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1))); // Exponential backoff
      continue;
    }
    
    await updateGame(gameToken, updatedGame);
    return updatedGame;
  }
  
  // All retries failed
  console.error('Failed to add player after max retries - race condition');
  return null;
}
