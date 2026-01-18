import Pusher from 'pusher';
import { GameState } from '@/types/game';
import { ImposterGameAction } from '@/types/imposter';

// Server-side Pusher client (for API routes)
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER || 'ap2',
  useTLS: true,
});

/**
 * Broadcast game state update to all players in a RMCS game room
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
    console.log(`✅ Broadcasted RMCS update to game-${gameToken}`);
  } catch (error) {
    console.error('❌ Failed to broadcast via Pusher:', error);
  }
}

/**
 * Broadcast a game action/diff to all Imposter players
 * Clients apply the action directly to their local state for INSTANT updates
 * No additional API call needed!
 */
export async function broadcastImposterAction(
  gameToken: string,
  action: ImposterGameAction
): Promise<void> {
  try {
    await pusherServer.trigger(
      `imposter-${gameToken}`,
      'game-action',
      { ...action, timestamp: Date.now() }
    );
    console.log(`✅ Broadcasted action [${action.type}] to imposter-${gameToken}`);
  } catch (error) {
    console.error('❌ Failed to broadcast Imposter action:', error);
  }
}

/**
 * Broadcast a REFRESH signal (fallback for complex state changes)
 * Used when action-based updates aren't sufficient
 */
export async function broadcastImposterRefresh(
  gameToken: string,
  reason: string = 'refresh'
): Promise<void> {
  try {
    await pusherServer.trigger(
      `imposter-${gameToken}`,
      'force-refresh',
      { reason, timestamp: Date.now() }
    );
    console.log(`✅ Broadcasted force-refresh to imposter-${gameToken}`);
  } catch (error) {
    console.error('❌ Failed to broadcast refresh:', error);
  }
}

// Keep for backward compatibility
export async function broadcastImposterUpdate(
  gameToken: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _clientState: unknown
): Promise<void> {
  await broadcastImposterRefresh(gameToken, 'state-update');
}

export async function broadcastImposterEvent(
  gameToken: string,
  eventName: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await pusherServer.trigger(
      `imposter-${gameToken}`,
      eventName,
      { ...data, timestamp: Date.now() }
    );
    console.log(`✅ Broadcasted ${eventName} to imposter-${gameToken}`);
  } catch (error) {
    console.error(`❌ Failed to broadcast ${eventName}:`, error);
  }
}
