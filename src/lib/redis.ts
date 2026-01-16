import { Redis } from '@upstash/redis';

// Initialize Redis client
// You'll need to add these environment variables after creating your Upstash database
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Fallback to in-memory storage if Redis is not configured
const inMemoryGames = new Map<string, any>();

export const useInMemoryFallback = !process.env.UPSTASH_REDIS_REST_URL;

export { inMemoryGames };
