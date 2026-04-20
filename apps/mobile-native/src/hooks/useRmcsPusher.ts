import { useEffect, useRef, useCallback, useState } from 'react';
import Pusher from 'pusher-js';
import { RmcsGameState } from '../types/rmcs';

interface UseRmcsPusherOptions {
  gameToken: string;
  playerId: string;
  onStateUpdate: (state: RmcsGameState) => void;
  enabled?: boolean;
}

let pusherClient: any = null;

function getPusherClient(): any {
  if (!pusherClient) {
    try {
      const PusherClass = (Pusher as any).default || (Pusher as any).Pusher || Pusher;
      pusherClient = new PusherClass('ad089f51efc32c61861a', {
        cluster: 'ap2',
        enableStats: false,
      });
    } catch (error) {
      console.error('[🔌 RMCS Pusher Init Error]', error);
    }
  }
  return pusherClient;
}

export function useRmcsPusher({ gameToken, playerId, onStateUpdate, enabled = true }: UseRmcsPusherOptions) {
  const channelRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onStateUpdateRef = useRef(onStateUpdate);

  useEffect(() => {
    onStateUpdateRef.current = onStateUpdate;
  }, [onStateUpdate]);

  const subscribeToChannel = useCallback(() => {
    if (!gameToken || !playerId || !enabled) return;

    try {
      const pusher = getPusherClient();
      const channelName = `game-${gameToken}`;
      console.log(`[🔌 RMCS Pusher] Subscribing to ${channelName}`);
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      channel.bind('pusher:subscription_succeeded', () => {
        setIsConnected(true);
      });

      channel.bind('pusher:subscription_error', () => {
        setIsConnected(false);
      });

      channel.bind('state-update', (data: RmcsGameState) => {
        onStateUpdateRef.current(data);
      });
    } catch (error) {
      console.error('[❌ RMCS Pusher Subscribe Error]', error);
      setIsConnected(false);
    }
  }, [gameToken, playerId, enabled]);

  const unsubscribeFromChannel = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unbind('state-update');
      pusherClient?.unsubscribe(`game-${gameToken}`);
    }
    channelRef.current = null;
    setIsConnected(false);
  }, [gameToken]);

  useEffect(() => {
    subscribeToChannel();
    return () => unsubscribeFromChannel();
  }, [subscribeToChannel, unsubscribeFromChannel]);

  return { isConnected };
}
