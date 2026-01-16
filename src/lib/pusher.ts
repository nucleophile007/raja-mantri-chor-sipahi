import Pusher from 'pusher';
import { GameState } from '@/types/game';

// Server-side Pusher client (for API routes)
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || 'ap2',
  useTLS: true,
});

/**
 * Broadcast game state update to all players in a game room
 * @param gameToken - The game token identifying the room
 * @param gameState - The updated game state to broadcast
 */
export async function broadcastGameUpdate(
  gameToken: string,
  gameState: GameState
): Promise<void> {
  try {
    await pusherServer.trigger(
      `game-${gameToken}`,
      'state-update',
      gameState
    );
    console.log(`✅ Broadcasted update to game-${gameToken}`);
  } catch (error) {
    console.error('❌ Failed to broadcast via Pusher:', error);
    // Don't throw - game should still work even if Pusher fails
  }
}
