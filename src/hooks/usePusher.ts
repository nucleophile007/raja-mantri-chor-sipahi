'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Pusher from 'pusher-js';
import { GameState } from '@/types/game';

interface UsePusherOptions {
  gameToken: string;
  onStateUpdate: (state: GameState) => void;
  enabled?: boolean;
}

// Shared Pusher instance
let sharedPusher: Pusher | null = null;
let connectionChangeCallbacks: Set<(state: string) => void> = new Set();

function getSharedPusher(): Pusher {
  if (!sharedPusher) {
    sharedPusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
      authEndpoint: '/api/pusher/auth',
      auth: {
        params: {
          user_id: localStorage.getItem('imposter_playerId') || 'anon',
          user_name: 'Player'
        }
      },
      enabledTransports: ['ws', 'wss'],
      disableStats: true,
    });

    // Track connection state changes for all subscribers
    sharedPusher.connection.bind('state_change', (states: { current: string; previous: string }) => {
      console.log(`📡 Pusher: ${states.previous} → ${states.current}`);
      connectionChangeCallbacks.forEach(cb => cb(states.current));
    });
  }
  return sharedPusher;
}

// Track channel reference counts to prevent premature unsubscription
const channelRefs = new Map<string, { count: number; channel: any }>();

function subscribeToChannel(pusher: Pusher, channelName: string) {
  let ref = channelRefs.get(channelName);
  if (!ref) {
    const channel = pusher.subscribe(channelName);
    ref = { count: 0, channel };
    channelRefs.set(channelName, ref);
  }
  ref.count++;
  console.log(`📡 Subscribe ${channelName} (Refs: ${ref.count})`);
  return ref.channel;
}

function unsubscribeFromChannel(pusher: Pusher, channelName: string) {
  const ref = channelRefs.get(channelName);
  if (ref) {
    ref.count--;
    console.log(`End Subscribe ${channelName} (Refs: ${ref.count})`);
    if (ref.count <= 0) {
      pusher.unsubscribe(channelName);
      channelRefs.delete(channelName);
      console.log(`🔌 Unsubscribed ${channelName}`);
    }
  }
}

/**
 * Hook to subscribe to real-time game updates via Pusher
 * Automatically handles connection, disconnection, and cleanup
 * Optimized: Reuses Pusher instance across re-renders
 */
export function usePusher({ gameToken, onStateUpdate, enabled = true }: UsePusherOptions) {
  const channelRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);

  // Memoize callback to prevent unnecessary re-subscriptions
  const handleStateUpdate = useCallback((newState: GameState) => {
    onStateUpdate(newState);
  }, [onStateUpdate]);

  useEffect(() => {
    if (!enabled || !gameToken) return;

    const pusher = getSharedPusher();
    // Subscribe using ref counting
    const channel = subscribeToChannel(pusher, `game-${gameToken}`);
    channelRef.current = channel;

    // Listen for state updates (use memoized callback)
    channel.bind('state-update', handleStateUpdate);

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        unsubscribeFromChannel(pusher, `game-${gameToken}`);
        channelRef.current = null;
      }
    };
  }, [gameToken, enabled, handleStateUpdate]);

  return {
    isConnected: sharedPusher?.connection.state === 'connected',
  };
}

/**
 * Generic Pusher hook for any channel and event
 * Includes onReconnect callback to fetch fresh state after disconnection
 */
export function useGenericPusher<T>(
  channelName: string,
  eventName: string,
  onEvent: (data: T) => void,
  enabled: boolean = true,
  onReconnect?: () => void  // Called when Pusher reconnects after being disconnected
) {
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  const channelRef = useRef<ReturnType<Pusher['subscribe']> | null>(null);
  const wasDisconnected = useRef(false);
  const [connectionState, setConnectionState] = useState<string>('connecting');

  // Update refs when callbacks change
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  const handleEvent = useCallback((data: T) => {
    // console.log(`📩 Pusher event received on ${channelName}:${eventName}`, data); // Reduce log spam too
    if (onEventRef.current) {
      onEventRef.current(data);
    }
  }, [channelName, eventName]);

  useEffect(() => {
    if (!enabled || !channelName) return;

    const pusher = getSharedPusher();
    // Subscribe using ref counting
    const channel = subscribeToChannel(pusher, channelName);
    channelRef.current = channel;

    channel.bind(eventName, handleEvent);

    // Track connection state for reconnection detection
    const handleConnectionChange = (state: string) => {
      setConnectionState(state);

      if (state === 'disconnected' || state === 'unavailable') {
        wasDisconnected.current = true;
      }

      // On reconnect, trigger refresh
      if (state === 'connected' && wasDisconnected.current) {
        wasDisconnected.current = false;
        console.log('🔄 Pusher reconnected, triggering refresh...');
        if (onReconnectRef.current) {
          onReconnectRef.current();
        }
      }
    };

    connectionChangeCallbacks.add(handleConnectionChange);

    return () => {
      connectionChangeCallbacks.delete(handleConnectionChange);
      if (channelRef.current) {
        channelRef.current.unbind(eventName, handleEvent);
        unsubscribeFromChannel(pusher, channelName);
        channelRef.current = null;
      }
    };
  }, [channelName, eventName, enabled, handleEvent]); // onReconnect and onEvent removed from deps

  return { connectionState };
}

/**
 * Hook to get Pusher connection state
 */
export function usePusherConnectionState() {
  const [state, setState] = useState<string>('connecting');

  useEffect(() => {
    const handleChange = (newState: string) => setState(newState);
    connectionChangeCallbacks.add(handleChange);

    // Get initial state
    if (sharedPusher) {
      setState(sharedPusher.connection.state);
    }

    return () => {
      connectionChangeCallbacks.delete(handleChange);
    };
  }, []);

  return state;
}
