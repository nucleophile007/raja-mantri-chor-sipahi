import { useEffect, useRef, useCallback, useState } from 'react';
import Pusher from 'pusher-js';
import { ImposterGameAction } from '../types/imposter';

interface UsePusherOptions {
  gameToken: string;
  playerId: string;
  onAction: (action: ImposterGameAction) => void;
  onConnectionStateChange?: (connected: boolean) => void;
}

let pusherClient: any = null;
let connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

// Initialize Pusher once globally with error handling
function getPusherClient(): any {
  if (!pusherClient) {
    try {
      // Handle different module resolution behaviors in React Native / Metro
      const PusherClass = (Pusher as any).default || (Pusher as any).Pusher || Pusher;
      
      pusherClient = new PusherClass('ad089f51efc32c61861a', {
        cluster: 'ap2',
        enableStats: false,
      });

      // Global connection handlers
      pusherClient.connection.bind('state_change', (states: any) => {
        const { previous, current } = states;
        console.log(`[🔌 Pusher] Connection state: ${previous} → ${current}`);
        connectionState = current;
      });

      pusherClient.connection.bind('connected', () => {
        console.log('[🔌 Pusher] Connected ✅');
        connectionState = 'connected';
      });

      pusherClient.connection.bind('unavailable', () => {
        console.warn('[🔌 Pusher] Unavailable ⚠️');
        connectionState = 'disconnected';
      });

      pusherClient.connection.bind('failed', () => {
        console.error('[🔌 Pusher] Connection failed ❌');
        connectionState = 'disconnected';
      });

      pusherClient.connection.bind('disconnected', () => {
        console.log('[🔌 Pusher] Disconnected');
        connectionState = 'disconnected';
      });
    } catch (error) {
      console.error('[🔌 Pusher Init Error]', error);
    }
  }
  return pusherClient;
}

export function usePusher({
  gameToken,
  playerId,
  onAction,
  onConnectionStateChange,
}: UsePusherOptions) {
  const channelRef = useRef<any>(null);
  const presenceChannelRef = useRef<any>(null);
  const subscriptionsRef = useRef<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  
  const onActionRef = useRef(onAction);
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  const onConnectionStateChangeRef = useRef(onConnectionStateChange);
  useEffect(() => {
    onConnectionStateChangeRef.current = onConnectionStateChange;
  }, [onConnectionStateChange]);

  const subscribeToChannel = useCallback(() => {
    if (!gameToken || !playerId) {
      console.warn('[🔌 Pusher] Missing gameToken or playerId');
      return;
    }

    try {
      const pusher = getPusherClient();
      const channelName = `imposter-${gameToken}`;

      console.log(`[🔌 Pusher] Subscribing to ${channelName}`);

      // Subscribe to game action channel
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // Subscribe to presence channel
      const presenceChannelName = `presence-imposter-${gameToken}`;
      const presenceChannel = pusher.subscribe(presenceChannelName);
      presenceChannelRef.current = presenceChannel;

      // Channel subscription handlers
      channel.bind('pusher:subscription_succeeded', () => {
        console.log(`[✅ Subscribed] ${channelName}`);
        reconnectAttemptsRef.current = 0;
        setIsConnected(true);
        onConnectionStateChangeRef.current?.(true);
      });

      channel.bind('pusher:subscription_error', (error: any) => {
        console.error(`[❌ Subscription Error] ${channelName}:`, error);
        setIsConnected(false);
        onConnectionStateChangeRef.current?.(false);
      });

      // Game action handler
      const gameActionHandler = (data: any) => {
        console.log(`[🎮 Game Action] ${data.type || 'unknown'}`, data);
        onActionRef.current(data);
      };

      // Bind to all game action events
      const events = [
        'game-action',
        'PLAYER_JOINED',
        'PLAYER_LEFT',
        'PLAYER_KICKED',
        'GAME_STARTED',
        'CARDS_DEALT',
        'SCRATCHING',
        'PLAYER_SCRATCHED',
        'MILESTONE',
        'DISCUSSION_START',
        'DISCUSSION',
        'VOTING_START',
        'VOTING',
        'PLAYER_VOTED',
        'GAME_ENDED',
        'WORD_READY',
        'BACK_TO_LOBBY',
        'PLAYER_ENTERED_LOBBY',
        'HOST_CHANGED',
      ];

      events.forEach((event) => {
        channel.bind(event, gameActionHandler);
        subscriptionsRef.current.push(event);
      });

      // Presence events
      presenceChannel.bind('pusher:subscription_succeeded', (members: any) => {
        console.log(`[👥 Presence] ${members.count} members online`);
      });

      presenceChannel.bind('pusher:member_added', (member: any) => {
        console.log(`[👤 Member Added]`, member.id);
      });

      presenceChannel.bind('pusher:member_removed', (member: any) => {
        console.log(`[👤 Member Left]`, member.id);
      });
    } catch (error) {
      console.error('[❌ Pusher Subscribe Error]', error);
      setIsConnected(false);
      onConnectionStateChangeRef.current?.(false);
    }
  }, [gameToken, playerId]);

  const unsubscribeFromChannel = useCallback(() => {
    try {
      if (channelRef.current) {
        subscriptionsRef.current.forEach((event) => {
          channelRef.current?.unbind(event);
        });
        pusherClient?.unsubscribe(`imposter-${gameToken}`);
        pusherClient?.unsubscribe(`presence-imposter-${gameToken}`);
        console.log('[🔌 Unsubscribed from channels]');
      }
    } catch (error) {
      console.error('[❌ Unsubscribe Error]', error);
    }
    channelRef.current = null;
    presenceChannelRef.current = null;
    subscriptionsRef.current = [];
    setIsConnected(false);
    onConnectionStateChange?.(false);
  }, [gameToken, onConnectionStateChange]);

  // Subscribe on mount
  useEffect(() => {
    subscribeToChannel();
    return () => {
      unsubscribeFromChannel();
    };
  }, [subscribeToChannel, unsubscribeFromChannel]);

  // Reconnection monitor
  useEffect(() => {
    const reconnectInterval = setInterval(() => {
      if (!isConnected && gameToken && playerId) {
        reconnectAttemptsRef.current++;
        if (reconnectAttemptsRef.current <= 5) {
          console.log(
            `[🔄 Reconnect Attempt] ${reconnectAttemptsRef.current}/5`,
          );
          subscribeToChannel();
        }
      }
    }, 5000);

    return () => clearInterval(reconnectInterval);
  }, [isConnected, gameToken, playerId, subscribeToChannel]);

  return {
    isConnected,
    channel: channelRef.current,
  };
}
