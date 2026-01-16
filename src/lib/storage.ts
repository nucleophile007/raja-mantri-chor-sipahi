import { GameState, Player } from '@/types/game';
import { redis, useInMemoryFallback, inMemoryGames } from './redis';
import { getCachedGame, setCachedGame, invalidateCache } from './cache';

// TTL for games: 24 hours (in seconds)
const GAME_TTL = 24 * 60 * 60;

// Helper function to get Redis key
function getGameKey(gameToken: string): string {
  return `game:${gameToken}`;
}

export async function createGame(gameToken: string, hostPlayer: Player): Promise<GameState> {
  const gameState: GameState = {
    gameToken,
    players: [hostPlayer],
    currentRound: 0,
    gameStatus: 'WAITING',
    roundHistory: [],
    maxRounds: 5
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
  const game = await getGame(gameToken);
  if (!game || game.players.length >= 4) {
    return null;
  }
  
  game.players.push(player);
  await updateGame(gameToken, game);
  return game;
}
