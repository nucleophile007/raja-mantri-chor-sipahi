'use client';

import { useEffect, useRef, useCallback } from 'react';
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
 * Optimized: Reuses Pusher instance across re-renders
 */
export function usePusher({ gameToken, onStateUpdate, enabled = true }: UsePusherOptions) {
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);
  
  // Memoize callback to prevent unnecessary re-subscriptions
  const handleStateUpdate = useCallback((newState: GameState) => {
    onStateUpdate(newState);
  }, [onStateUpdate]);

  useEffect(() => {
    if (!enabled || !gameToken) return;

    // Reuse existing Pusher instance if available
    if (!pusherRef.current) {
      const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
        enabledTransports: ['ws', 'wss'], // Only use WebSocket (faster)
        disableStats: true, // Disable stats for better performance
      });
      pusherRef.current = pusher;
    }

    const pusher = pusherRef.current;

    // Subscribe to game channel
    const channel = pusher.subscribe(`game-${gameToken}`);
    channelRef.current = channel;

    // Listen for state updates (use memoized callback)
    channel.bind('state-update', handleStateUpdate);

    // Connection state logging (only in dev mode)
    if (process.env.NODE_ENV === 'development') {
      pusher.connection.bind('connected', () => {
        console.log('✅ Pusher connected');
      });

      pusher.connection.bind('disconnected', () => {
        console.log('⚠️ Pusher disconnected');
      });

      pusher.connection.bind('error', (error: any) => {
        console.error('❌ Pusher error:', error);
      });
    }

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      // Don't disconnect Pusher - reuse the connection
    };
  }, [gameToken, enabled, handleStateUpdate]);

  return {
    isConnected: pusherRef.current?.connection.state === 'connected',
  };
}
