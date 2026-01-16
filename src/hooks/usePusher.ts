'use client';

import { useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { GameState } from '@/types/game';

interface UsePusherOptions {
  gameToken: string;
  onStateUpdate: (state: GameState) => void;
  enabled?: boolean;
}

/**
 * Hook to subscribe to real-time game updates via Pusher
 * Automatically handles connection, disconnection, and cleanup
 */
export function usePusher({ gameToken, onStateUpdate, enabled = true }: UsePusherOptions) {
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled || !gameToken) return;

    // Initialize Pusher client
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
    });

    pusherRef.current = pusher;

    // Subscribe to game channel
    const channel = pusher.subscribe(`game-${gameToken}`);
    channelRef.current = channel;

    // Listen for state updates
    channel.bind('state-update', (newState: GameState) => {
      console.log('📡 Received real-time update from Pusher:', newState.gameStatus);
      onStateUpdate(newState);
    });

    // Connection state logging
    pusher.connection.bind('connected', () => {
      console.log('✅ Pusher connected');
    });

    pusher.connection.bind('disconnected', () => {
      console.log('⚠️ Pusher disconnected');
    });

    pusher.connection.bind('error', (error: any) => {
      console.error('❌ Pusher error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        channelRef.current.unsubscribe();
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
      console.log('🔌 Pusher disconnected and cleaned up');
    };
  }, [gameToken, enabled, onStateUpdate]);

  return {
    isConnected: pusherRef.current?.connection.state === 'connected',
  };
}
