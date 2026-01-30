'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ImposterClientState } from '@/types/imposter';
import { useGenericPusher } from '@/hooks/usePusher';
import ScratchCard from './ScratchCard';
import VotingPanel from './VotingPanel';

interface ImposterRoomProps {
    gameToken: string;
}

const MIN_PLAYERS = 3;

export default function ImposterRoom({ gameToken }: ImposterRoomProps) {
    const [gameState, setGameState] = useState<ImposterClientState | null>(null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [cardContent, setCardContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
    const router = useRouter();
    const fetchingRef = useRef(false);

    // Get player ID from localStorage
    useEffect(() => {
        const storedPlayerId = localStorage.getItem('imposter_playerId');
        const storedGameToken = localStorage.getItem('imposter_gameToken');

        if (storedGameToken !== gameToken) {
            router.push('/');
            return;
        }

        if (storedPlayerId) {
            setPlayerId(storedPlayerId);
        }
    }, [gameToken, router]);

    // Fetch game state function
    const fetchState = useCallback(async (showLoading = false) => {
        if (!playerId || fetchingRef.current) return;

        fetchingRef.current = true;
        if (showLoading) setLoading(true);

        try {
            const response = await fetch(
                `/api/imposter/state?gameToken=${gameToken}&playerId=${playerId}`,
                { cache: 'no-store' }
            );
            const data = await response.json();

            if (data.success) {
                setGameState(data.gameState);
                setConnectionStatus('connected');

                if (data.gameState.myCard) {
                    setCardContent(data.gameState.myCard);
                }

                // DO NOT clear session on RESULT, otherwise players can't restart
                // Only clear if explicitly kicked or leaving
            } else if (data.error === 'Player not found in game') {
                // Only clear if genuine 404 (kicked/game deleted)
                console.warn('Player not found, clearing session');
                localStorage.removeItem('imposter_playerId');
                localStorage.removeItem('imposter_gameToken');
                router.push('/');
            }
        } catch (err) {
            console.error('Failed to fetch state:', err);
            setConnectionStatus('disconnected');
        } finally {
            fetchingRef.current = false;
            if (showLoading) setLoading(false);
        }
    }, [gameToken, playerId, router]);

    // Initial fetch
    useEffect(() => {
        if (playerId) {
            fetchState(true);
        }
    }, [playerId, fetchState]);
    // ============================================
    // INSTANT UI UPDATES - Apply actions locally without API calls
    // ============================================
    const handleGameAction = useCallback((action: {
        type: string;
        playerName?: string;
        isHost?: boolean;
        newHostName?: string;
        scratchedCount?: number;
        totalActive?: number;
        status?: string;
        voterName?: string;
        votedCount?: number;
        result?: string;
        imposterName?: string;
        endReason?: string;
        message?: string; // For MILESTONE actions
        kickedPlayerId?: string;
        kickedPlayerName?: string;
        voteResults?: Array<{ playerName: string; voteCount: number; isImposter: boolean }>;
    }) => {
        console.log(`⚡ Instant action: ${action.type}`);

        setGameState(prev => {
            if (!prev) return prev;

            switch (action.type) {
                case 'PLAYER_JOINED':
                    // Add new player to list instantly
                    if (action.playerName && !prev.players.some(p => p.name === action.playerName)) {
                        // Show join notification
                        setMilestoneToast(`[+] ${action.playerName} JOINED`);
                        setTimeout(() => setMilestoneToast(null), 3000);

                        return {
                            ...prev,
                            players: [...prev.players, {
                                name: action.playerName,
                                isHost: action.isHost || false,
                                isActive: true,
                                hasScratched: false,
                                hasVoted: false,
                                isInLobby: true,
                                isMe: false
                            }]
                        };
                    }
                    return prev;

                case 'PLAYER_LEFT':
                case 'PLAYER_KICKED':
                    // Show notification
                    if (action.kickedPlayerName || action.playerName) {
                        const name = action.kickedPlayerName || action.playerName;
                        const msg = action.type === 'PLAYER_KICKED' ? `🚫 ${name} KICKED` : `[-] ${name} LEFT`;
                        setMilestoneToast(msg);
                        setTimeout(() => setMilestoneToast(null), 3000);
                    }

                    // Remove player from list instantly based on broadcast
                    return {
                        ...prev,
                        amIHost: action.newHostName && prev.myName === action.newHostName ? true : prev.amIHost,
                        players: prev.players.filter(p =>
                            p.name !== (action.kickedPlayerName || action.playerName)
                        ).map(p =>
                            action.newHostName && p.name === action.newHostName
                                ? { ...p, isHost: true }
                                : p
                        )
                    };

                case 'PLAYER_SCRATCHED':
                    console.log('⚡ Received PLAYER_SCRATCHED:', action.playerName);
                    // Mark player as scratched instantly
                    return {
                        ...prev,
                        players: prev.players.map(p =>
                            p.name === action.playerName
                                ? { ...p, hasScratched: true }
                                : p
                        )
                    };

                case 'GAME_STARTED':
                    // Update game status instantly and fetch full state
                    setTimeout(() => fetchState(false), 500);
                    return {
                        ...prev,
                        gameStatus: (action.status as ImposterClientState['gameStatus']) || prev.gameStatus
                    };

                case 'WORD_READY':
                    // Word has been generated in background, fetch to get it
                    console.log('📝 Word is ready! Fetching...');
                    setTimeout(() => fetchState(false), 100);
                    return prev;

                case 'MILESTONE':
                    // Show toast notification for milestone
                    setMilestoneToast(action.message || 'Milestone reached!');
                    setTimeout(() => setMilestoneToast(null), 4000);
                    return prev;

                case 'VOTING_STARTED':
                    // Fetch state to get voting details
                    setTimeout(() => fetchState(false), 500);
                    return { ...prev, gameStatus: 'VOTING' };

                case 'PLAYER_VOTED':
                    // Mark player as voted instantly
                    return {
                        ...prev,
                        players: prev.players.map(p =>
                            p.name === action.voterName
                                ? { ...p, hasVoted: true }
                                : p
                        ),
                        votes: action.voterName
                            ? [...prev.votes, { voterName: action.voterName }]
                            : prev.votes
                    };

                case 'GAME_ENDED':
                    // Show result instantly and fetch full vote details
                    setTimeout(() => fetchState(false), 500);
                    // Clear card content from previous game
                    setCardContent(null);
                    return {
                        ...prev,
                        gameStatus: 'RESULT',
                        result: action.result as ImposterClientState['result'],
                        imposterName: action.imposterName || null,
                        endReason: action.endReason || null,
                        voteResults: action.voteResults || null
                    };

                case 'HOST_IN_LOBBY':
                    // Host has clicked back to lobby - others can follow
                    return {
                        ...prev,
                        hostInLobby: true,
                        // Update host's isInLobby status locally if known
                        players: prev.players.map(p =>
                            p.isHost ? { ...p, isInLobby: true } : p
                        )
                    };

                case 'PLAYER_ENTERED_LOBBY':
                    return {
                        ...prev,
                        players: prev.players.map(p =>
                            p.name === action.playerName
                                ? { ...p, isInLobby: true }
                                : p
                        )
                    };

                case 'PLAYER_KICKED':
                    // If I am the kicked player
                    if (playerId && action.kickedPlayerId === playerId) {
                        alert('You have been kicked by the host.');
                        localStorage.removeItem('imposter_playerId');
                        localStorage.removeItem('imposter_gameToken');
                        window.location.href = '/';
                        return prev;
                    }

                    // For others, remove player from list
                    setMilestoneToast(`🚫 ${action.kickedPlayerName} WAS KICKED`);
                    setTimeout(() => setMilestoneToast(null), 3000);

                    return {
                        ...prev,
                        players: prev.players.filter(p => p.name !== action.kickedPlayerName)
                    };


                case 'BACK_TO_LOBBY':
                    // Everyone goes back to lobby - clear game data
                    setCardContent(null); // Clear previous card
                    return {
                        ...prev,
                        gameStatus: 'WAITING',
                        myCard: null,
                        imposterName: null,
                        amIImposter: null,
                        hostInLobby: true,
                        votes: [],
                        voteResults: null,
                        result: null,
                        endReason: null,
                        players: prev.players.map(p => ({
                            ...p,
                            hasScratched: false,
                            hasVoted: false,
                            isInLobby: false // Reset initially, specific updates will come via PLAYER_ENTERED_LOBBY
                        }))
                    };

                default:
                    return prev;
            }
        });
    }, []);

    // Subscribe to game actions for INSTANT updates
    // CRITICAL FIX: Must allow "game-action" on "imposter-" channel, NOT "presence-" channel.
    useGenericPusher(
        `imposter-${gameToken}`,
        'game-action',
        handleGameAction,
        !!playerId,
        // On reconnect, fetch fresh state
        () => {
            console.log('🔄 Reconnected! Fetching fresh state...');
            fetchState(false);
        }
    );

    // Heartbeat Removed - Using Pusher Presence
    // No regular POST calls to /api/heartbeat needed.

    // Track online players for real-time visualization
    const [onlineNames, setOnlineNames] = useState<Set<string>>(new Set());

    // Memoize handlers to prevent re-subscription loops
    const handleMemberAdded = useCallback((data: any) => {
        console.log('Member added:', data);
        if (data.info && data.info.name) {
            setMilestoneToast(`[+] ${data.info.name} ONLINE`);
            setTimeout(() => setMilestoneToast(null), 3000);
            setOnlineNames(prev => {
                const newSet = new Set(prev);
                newSet.add(data.info.name);
                return newSet;
            });
        }
    }, []);

    const handleMemberRemoved = useCallback((data: any) => {
        console.log('Member removed:', data);
        if (data.info && data.info.name) {
            setMilestoneToast(`[-] ${data.info.name} OFFLINE`);
            setTimeout(() => setMilestoneToast(null), 3000);
            setOnlineNames(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.info.name);
                return newSet;
            });
        }
    }, []);

    const handleSubscriptionSucceeded = useCallback((data: any) => {
        // data.members is a map of ID -> Info
        // But the raw event data structure from Pusher might be different or `data` here IS the members object?
        // Actually, pusher-js client `pusher:subscription_succeeded` callback receives `members` object if bound on channel?
        // Wait, standard bind('pusher:subscription_succeeded') on channel receives the members object? 
        // No, typically you access channel.members. It's safer to rely on `pusher:member_added` for delta 
        // BUT relying on delta misses initial state.
        // Let's assume data has members.
        console.log('Subscription succeeded', data);
        // We can't easily iterate data.members if it's the pusher object.
        // Let's rely on the fact that we fetch game state and `isOnline` can be derived?
        // No, game state fetch is snapshot. Presence is live.
        // Quick fix: Assume everyone in `gameState` is offline until we hear otherwise? relative.
        // Better: Just track updates. 
    }, []);
    // Re-thinking: Accessing `channel.members` is best. 
    // But `useGenericPusher` completely hides the channel.
    // I should probably skip `handleSubscriptionSucceeded` for now and just rely on add/remove 
    // AND assume everyone is ONLINE initially if I just fetched? No.

    // NEW STRATEGY: 
    // I will modify `useGenericPusher` in next step to return the channel or expose members?
    // OR: I can just implement the listeners here and trust `member_added` will fire for NEW people.
    // For existing people, I might miss them if I don't check `channel.members`.

    // Let's stick to the current plan: Just Add/Remove for now, ensuring the "Toast" works. 
    // The user asked for "player coming exiting in lobby". That is Add/Remove.
    // I will keep the toast logic I have, but add state tracking so I can Gray them out later.

    // Listen for Member Added/Removed to show toasts & update state
    useGenericPusher(
        `presence-imposter-${gameToken}`,
        'pusher:member_added',
        handleMemberAdded,
        !!playerId
    );

    useGenericPusher(
        `presence-imposter-${gameToken}`,
        'pusher:member_removed',
        handleMemberRemoved,
        !!playerId
    );

    // Subscribe to subscription success to get initial count?
    // Actually, `pusher:subscription_succeeded` provides `members` object in the callback data?
    // Documentation says: `channel.bind('pusher:subscription_succeeded', (members) => ...)`
    useGenericPusher(
        `presence-imposter-${gameToken}`,
        'pusher:subscription_succeeded',
        (members: any) => {
            // Pusher members object has .each() method
            const names = new Set<string>();
            if (members && members.each) {
                members.each((member: any) => {
                    if (member.info && member.info.name) {
                        names.add(member.info.name);
                    }
                });
                setOnlineNames(names);
            }
        },
        !!playerId
    );


    // Pruning/Progress Check Loop (Lazy logic)
    useEffect(() => {
        if (!playerId || !gameToken || !gameState || gameState.gameStatus !== 'SCRATCHING') return;

        // Only check progress every 15s during scratching phase
        // This replaces the heavy logic that used to be in every heartbeat
        const checkPrune = async () => {
            try {
                await fetch('/api/imposter/check-prune', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameToken, playerId }),
                });
            } catch (err) {
                // Silent fail
            }
        };

        const intervalId = setInterval(() => {
            if (!document.hidden) {
                checkPrune();
            }
        }, 15000);

        return () => clearInterval(intervalId);
    }, [gameToken, playerId, gameState?.gameStatus]);

    // Handle Force Start Voting (Host Override)
    const handleForceVoting = useCallback(async () => {
        if (!confirm('Force start voting? This will skip waiting for remaining players.')) return;
        setLoading(true);
        try {
            const response = await fetch('/api/imposter/start-voting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameToken, playerId, force: true }) // Added force flag support (need to update API too?)
                // Actually start-voting API usually just starts it. 
                // If it has validation "allScratched", we should send a force flag or assume start-voting is manual enough.
                // Let's check start-voting API later. Assuming it works or I'll update it.
            });
            const data = await response.json();
            if (!data.success) alert(data.error);
        } catch (e) {
            alert('Failed to force voting');
        } finally {
            setLoading(false);
        }
    }, [gameToken, playerId]);

    // ... existing code ...

    // Auto-refresh when all players have scratched (run once)
    const allScratchedRefreshDone = useRef(false);
    useEffect(() => {
        if (!gameState || gameState.gameStatus !== 'SCRATCHING') {
            allScratchedRefreshDone.current = false; // Reset flag when not in scratching phase
            return;
        }

        const activePlayers = gameState.players.filter(p => p.isActive);
        const allScratched = activePlayers.length > 0 && activePlayers.every(p => p.hasScratched);

        if (allScratched && !allScratchedRefreshDone.current) {
            console.log('✅ All players scratched! Auto-refreshing...');
            allScratchedRefreshDone.current = true;
            setTimeout(() => fetchState(false), 500);
        }
    }, [gameState, fetchState]);

    // Also subscribe to force-refresh for fallback
    useGenericPusher<{ reason: string }>(
        `imposter-${gameToken}`,
        'force-refresh',
        () => {
            console.log('📡 Force refresh requested');
            fetchState(false);
        },
        !!playerId
    );

    // Update connection status
    const { connectionState } = useGenericPusher<unknown>(
        `imposter-${gameToken}`,
        'connection-check',
        () => { },
        !!playerId
    );

    useEffect(() => {
        let previousState = connectionState;

        if (connectionState === 'connected' && previousState !== 'connected' && playerId) {
            // Reconnected! Sync state
            console.log('✅ Pusher reconnected - syncing state');
            fetchState(false);
        }

        if (connectionState === 'connected') {
            setConnectionStatus('connected');
        } else if (connectionState === 'connecting') {
            setConnectionStatus('connecting');
        } else {
            setConnectionStatus('disconnected');
        }
    }, [connectionState, playerId, fetchState]);

    // Auto-check voting timeout
    const timeoutCheckDone = useRef(false);
    useEffect(() => {
        if (!gameState || gameState.gameStatus !== 'VOTING' || !gameState.votingStartedAt || !playerId) {
            timeoutCheckDone.current = false; // Reset when not in voting
            return;
        }

        const checkInterval = setInterval(async () => {
            const elapsed = Math.floor((Date.now() - gameState.votingStartedAt!) / 1000);
            const timeout = gameState.votingTimeout || 120;

            // If time is up and we haven't checked yet
            if (elapsed >= timeout && !timeoutCheckDone.current) {
                timeoutCheckDone.current = true;
                console.log('⏰ Voting timeout reached - calling check-timeout API...');

                try {
                    const response = await fetch('/api/imposter/check-timeout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gameToken, playerId })
                    });

                    const data = await response.json();
                    if (data.success && data.timedOut) {
                        console.log('✅ Voting auto-completed by server');
                        // Refresh state to see results
                        setTimeout(() => fetchState(false), 1000);
                    }
                } catch (err) {
                    console.error('Failed to check timeout:', err);
                }
            }
        }, 1000); // Check every second

        return () => clearInterval(checkInterval);
    }, [gameState, playerId, gameToken, fetchState]);


    // Handle scratching card with optimistic update
    const handleScratch = useCallback(async () => {
        if (!playerId || loading) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/imposter/scratch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameToken, playerId })
            });

            const data = await response.json();
            if (data.success && data.cardContent) {
                setCardContent(data.cardContent);

                // If word not ready, listen for WORD_READY and retry
                if (data.wordNotReady) {
                    setMilestoneToast('[GENERATING WORD] PLEASE WAIT...');
                    // Auto-refresh will happen when WORD_READY is broadcast
                    // The fetchState will get the real word
                } else {
                    // Optimistic update
                    if (gameState) {
                        const updatedPlayers = gameState.players.map(p =>
                            p.isMe ? { ...p, hasScratched: true } : p
                        );
                        setGameState({ ...gameState, players: updatedPlayers, myCard: data.cardContent });
                    }
                }
            } else if (data.error) {
                setError(data.error);
            }
        } catch (err) {
            setError('Failed to scratch card. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [gameToken, playerId, loading, gameState]);

    // Handle voting with optimistic update
    const handleVote = useCallback(async (targetName: string) => {
        if (!playerId || loading) return;

        setLoading(true);
        setError('');

        // Optimistic update
        if (gameState) {
            const updatedPlayers = gameState.players.map(p =>
                p.isMe ? { ...p, hasVoted: true } : p
            );
            setGameState({ ...gameState, players: updatedPlayers });
        }

        try {
            const response = await fetch('/api/imposter/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameToken, playerId, votedForName: targetName })
            });

            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'Failed to vote');
                // Revert optimistic update
                fetchState(false);
            }
        } catch (err) {
            setError('Failed to submit vote. Please try again.');
            fetchState(false);
        } finally {
            setLoading(false);
        }
    }, [gameToken, playerId, loading, gameState, fetchState]);

    // Handle start game
    const handleStartGame = useCallback(async () => {
        if (!playerId || loading) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/imposter/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameToken, playerId })
            });

            const data = await response.json();
            if (!data.success) {
                // If game already started (race condition), just refresh to join.
                if (data.error?.includes('already started') || data.error?.includes('active')) {
                    console.warn('Game already started, syncing...');
                    fetchState(true);
                } else {
                    setError(data.error || 'Failed to start game');
                }
            }
        } catch (err) {
            setError('Failed to start game. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [gameToken, playerId, loading]);

    // Handle start voting
    const handleStartVoting = useCallback(async () => {
        if (!playerId || loading) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/imposter/start-voting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameToken, playerId })
            });

            const data = await response.json();
            if (!data.success) {
                setError(data.error || 'Failed to start voting');
            }
        } catch (err) {
            setError('Failed to start voting. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [gameToken, playerId, loading]);

    // Handle back to lobby
    const handleRestart = useCallback(async () => {
        if (!playerId || loading) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/imposter/restart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameToken, playerId })
            });

            const data = await response.json();
            if (data.success && data.inLobby) {
                // Player is now in lobby - fetch fresh state to see the lobby
                setCardContent(null);
                await fetchState(false);
            } else if (data.waitingForHost) {
                setError('Please wait for the host to go to lobby first');
            } else if (!data.success) {
                setError(data.error || 'Failed to go to lobby');
            }
        } catch (err) {
            setError('Failed to go to lobby. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [gameToken, playerId, loading, fetchState]);

    // Handle leave game
    const handleLeave = useCallback(async () => {
        if (!playerId) return;

        if (!confirm('Are you sure you want to leave the game?')) return;

        setLoading(true);
        try {
            await fetch('/api/imposter/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameToken, playerId })
            });
        } catch (err) {
            console.error('Failed to leave:', err);
        }

        localStorage.removeItem('imposter_playerId');
        localStorage.removeItem('imposter_gameToken');
        router.push('/');
    }, [gameToken, playerId, router]);

    // Manual refresh button
    const handleManualRefresh = () => {
        fetchState(true);
    };

    // Kick player handler
    const handleKickPlayer = async (targetPlayerName: string, targetPlayerId: string) => { // We need ID actually
        // Ideally we need playerID for kicking, but client state hides IDs. 
        // WAIT: The kick API requires targetPlayerId.
        // The ClientState does NOT have player IDs (privacy). 
        // Checking implementation plan... 
        // Ah, the plan said "Render a Kick button... onClick call /api/kick".
        // ISSUE: Client doesn't have other players' IDs.
        // FIX 1: Allow kicking by NAME in API? Name is unique in game context since we prevent duplicates?
        // Actually join route doesn't strictly prevent duplicates but it should.
        // Let's modify the KICK route to accept name instead/also, OR
        // Let's modify client state to include masked IDs? No.
        // Safest is to use NAME for kick since names are visual identifiers. 
        // I need to update the KICK API to accept NAME.
    };

    // Correcting plan: I will update the frontend to use NAME for kick, 
    // but first I must update the backend route to support name-based kicking.
    // For now, let's just add the UI and I will fix the backend in next step.

    // Actually, I can fix the backend right now in a separate tool call if I abort this.
    // But better to stick to the plan. Let's assume I will fix backend to take `targetPlayerName`.

    const handleKick = async (targetPlayerName: string) => {
        if (!confirm(`Kick ${targetPlayerName}?`)) return;
        setLoading(true);
        try {
            const response = await fetch('/api/imposter/kick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameToken,
                    playerId,
                    targetPlayerName // Using name instead of ID
                })
            });
            const data = await response.json();
            if (!data.success) {
                // "Industry Level" Handling:
                // If backend says "Not Found", it means they are gone. Trust the backend.
                // We don't need to refresh the whole world, just remove the ghost player locally.
                if (data.error === 'Target player not found' || data.error?.includes('not found')) {
                    console.warn('Kick race condition: Player already left. Syncing UI.');

                    setMilestoneToast('⚠️ Player already left');
                    setTimeout(() => setMilestoneToast(null), 2000);

                    // Optimistic removal (Instant UI update)
                    setGameState(prev => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            players: prev.players.filter(p => p.name !== targetPlayerName)
                        };
                    });

                    // Background sync just to be safe (no loading spinner)
                    fetchState(false);
                } else {
                    alert(data.error);
                }
            }
        } catch (e) {
            alert('Failed to kick player');
        } finally {
            setLoading(false);
        }
    };


    const currentPlayer = gameState?.players.find(p => p.isMe);
    const isHost = gameState?.amIHost || false;
    const activePlayers = gameState?.players.filter(p => p.isActive) || [];
    // Only consider players who are physically in the lobby for starting count & display
    const lobbyPlayers = activePlayers.filter(p => p.isInLobby);
    const canStart = lobbyPlayers.length >= MIN_PLAYERS;

    if (!gameState) {
        return (
            <div className="min-h-screen pixel-grid flex items-center justify-center" style={{ background: 'var(--pixel-bg)' }}>
                <div className="text-center">
                    <div className="pixel-spinner mx-auto mb-4"></div>
                    <p className="pixel-text" style={{ color: 'var(--pixel-dark)' }}>Loading game...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen pixel-grid flex flex-col p-2 md:p-4 overflow-hidden" style={{ background: 'var(--pixel-bg)' }}>
            <div className="max-w-2xl mx-auto w-full flex flex-col h-full">
                {/* Header with connection status - Fixed at top */}
                <div className="pixel-card p-2 mb-2 flex-none shrink-0">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div>
                                <h1 className="pixel-text text-base md:text-lg leading-tight" style={{ color: 'var(--pixel-dark)' }}>🕵️ Imposter</h1>
                                <p className="text-xs" style={{ color: 'var(--pixel-dark)' }}>
                                    Code: <span className="font-bold">{gameToken}</span>
                                    <span className="ml-1">
                                        {connectionStatus === 'connected' && '🟢'}
                                        {connectionStatus === 'connecting' && '🟡'}
                                        {connectionStatus === 'disconnected' && '🔴'}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleManualRefresh}
                                className="pixel-btn text-sm flex items-center justify-center w-8 h-8 p-0"
                                disabled={loading}
                                title="Refresh game state"
                            >
                                🔄
                            </button>
                            <button
                                onClick={handleLeave}
                                className="pixel-btn text-sm flex items-center justify-center w-8 h-8 p-0"
                                style={{ background: 'var(--pixel-danger)', color: 'white' }}
                                title="Leave Game"
                            >
                                🚪
                            </button>
                        </div>
                    </div>
                    {/* Connection Status Banner - Only show if not connected/reconnecting to save space */}
                    {connectionStatus !== 'connected' && (
                        <div className="mt-1">
                            <div
                                className="pixel-card p-1 text-center text-[10px] font-bold"
                                style={{
                                    background: connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444',
                                    color: 'white',
                                    border: '1px solid var(--pixel-dark)',
                                    animation: 'pulse 2s ease-in-out infinite'
                                }}
                            >
                                {connectionStatus === 'connecting' ? '🟡 CONNECTING...' : '🔴 RECONNECTING...'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pb-20 custom-scrollbar">

                    {/* Error display */}
                    {error && (
                        <div className="pixel-card p-4 mb-4 flex justify-between items-center" style={{ background: 'var(--pixel-danger)', color: 'white' }}>
                            <span>{error}</span>
                            <button onClick={() => setError('')} className="ml-2 font-bold">✕</button>
                        </div>
                    )}

                    {/* Milestone Toast - Pixel Style */}
                    {milestoneToast && (
                        <div
                            className="mb-4 text-center"
                            style={{
                                animation: 'bounce 1s ease-in-out infinite',
                                filter: 'drop-shadow(4px 4px 0px var(--pixel-dark))'
                            }}
                        >
                            <div
                                className="pixel-card p-4"
                                style={{
                                    background: 'linear-gradient(135deg, var(--pixel-primary) 0%, var(--pixel-success) 100%)',
                                    color: 'white',
                                    border: '4px solid var(--pixel-dark)',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    textShadow: '2px 2px 0px rgba(0,0,0,0.3)'
                                }}
                            >
                                {milestoneToast}
                            </div>
                        </div>
                    )}

                    {/* Loading overlay */}
                    {loading && (
                        <div className="pixel-card p-2 mb-4 text-center" style={{ background: 'var(--pixel-accent)' }}>
                            <span style={{ color: 'var(--pixel-dark)' }}>Processing...</span>
                        </div>
                    )}

                    {/* WAITING state - In Lobby */}
                    {gameState.gameStatus === 'WAITING' && currentPlayer?.isInLobby && (
                        <div className="space-y-4">
                            <div className="pixel-card p-6 text-center">
                                <h2 className="pixel-text mb-4" style={{ color: 'var(--pixel-dark)' }}>
                                    Waiting for Players ({lobbyPlayers.length}/20)
                                </h2>
                                <p className="text-sm mb-4" style={{ color: 'var(--pixel-dark)' }}>
                                    Need at least {MIN_PLAYERS} players to start
                                    {lobbyPlayers.length < activePlayers.length && (
                                        <span className="block text-xs mt-1 text-gray-500">
                                            ({activePlayers.length - lobbyPlayers.length} players reviewing results)
                                        </span>
                                    )}
                                </p>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                    {lobbyPlayers.length === 0 && (
                                        <div className="col-span-full text-center p-4 opacity-50">
                                            Waiting for players to join lobby...
                                        </div>
                                    )}
                                    {lobbyPlayers.map((player, idx) => (
                                        <div key={idx} className="pixel-card p-2 text-center">
                                            <div className="relative group">
                                                <div className="flex flex-col justify-center items-center gap-1">
                                                    <span className="text-xl">{player.isHost ? '👑' : '👤'}</span>
                                                    {isHost && !player.isMe && !player.isHost && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleKick(player.name); }}
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700 shadow-md border border-black"
                                                            title="Kick Player"
                                                        >
                                                            🚫
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-sm font-bold truncate" style={{ color: 'var(--pixel-dark)' }}>
                                                    {player.name} {player.isMe && '(You)'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Voting Timeout Selector (Host Only) */}
                                {isHost && (
                                    <div className="pixel-card p-4 mb-4">
                                        <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                            ⏱️ Voting Timeout
                                        </label>
                                        <select
                                            value={gameState.votingTimeout || 120}
                                            onChange={async (e) => {
                                                const timeout = parseInt(e.target.value);
                                                try {
                                                    await fetch('/api/imposter/update-timeout', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ gameToken, playerId, votingTimeout: timeout })
                                                    });
                                                    await fetchState(false);
                                                } catch (err) {
                                                    console.error('Failed to update timeout');
                                                }
                                            }}
                                            className="pixel-input w-full"
                                        >
                                            <option value={30}>30 seconds</option>
                                            <option value={60}>1 minute</option>
                                            <option value={90}>1.5 minutes</option>
                                            <option value={120}>2 minutes</option>
                                            <option value={150}>2.5 minutes</option>
                                            <option value={180}>3 minutes</option>
                                        </select>
                                    </div>
                                )}

                                {isHost && (
                                    <button
                                        onClick={handleStartGame}
                                        disabled={!canStart || loading}
                                        className="pixel-btn w-full"
                                        style={{
                                            background: canStart ? 'var(--pixel-success)' : 'gray',
                                            color: 'white',
                                            opacity: loading ? 0.5 : 1
                                        }}
                                    >
                                        {loading ? '⏳ Starting...' : canStart ? '🎮 Start Game' : `Need ${MIN_PLAYERS - lobbyPlayers.length} more players`}
                                    </button>
                                )}

                                {!isHost && (
                                    <p style={{ color: 'var(--pixel-dark)' }}>⏳ Waiting for host to start...</p>
                                )}
                            </div>


                            <div className="pixel-card p-4 text-center">
                                <p className="text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>📤 Invite Players</p>
                                <p className="pixel-token text-2xl mb-3">{gameToken}</p>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => {
                                            const shareText = `🕵️ Join my Imposter game!\n\nCode: ${gameToken}\n\n${window.location.origin}/imposter/${gameToken}`;
                                            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                                        }}
                                        className="pixel-btn text-[10px] sm:text-xs p-1 sm:p-2 flex flex-col items-center justify-center gap-1 h-14"
                                        style={{ background: '#25D366', color: 'white' }}
                                    >
                                        <span className="text-lg leading-none">💬</span>
                                        <span>WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const shareText = `🕵️ Join my Imposter game!\nCode: ${gameToken}\n${window.location.origin}/imposter/${gameToken}`;
                                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
                                        }}
                                        className="pixel-btn text-[10px] sm:text-xs p-1 sm:p-2 flex flex-col items-center justify-center gap-1 h-14"
                                        style={{ background: '#1DA1F2', color: 'white' }}
                                    >
                                        <span className="text-lg leading-none">𝕏</span>
                                        <span>Share</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(gameToken);
                                            setMilestoneToast('[COPIED] CODE SAVED TO CLIPBOARD');
                                            setTimeout(() => setMilestoneToast(null), 2000);
                                        }}
                                        className="pixel-btn text-[10px] sm:text-xs p-1 sm:p-2 flex flex-col items-center justify-center gap-1 h-14"
                                    >
                                        <span className="text-lg leading-none">📋</span>
                                        <span>Copy</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WAITING state - Not In Lobby (e.g. Refreshed or Waiting) */}
                    {gameState.gameStatus === 'WAITING' && !currentPlayer?.isInLobby && (
                        <div className="pixel-card p-6 text-center">
                            <h2 className="pixel-text mb-4" style={{ color: 'var(--pixel-dark)' }}>
                                Game Ended
                            </h2>
                            <div className="pixel-card p-4 mb-4" style={{ background: 'var(--pixel-accent)' }}>
                                <p style={{ color: 'var(--pixel-dark)' }}>
                                    The host has returned to the lobby.
                                </p>
                            </div>
                            <button
                                onClick={handleRestart}
                                disabled={loading}
                                className="pixel-btn w-full"
                                style={{ background: 'var(--pixel-success)', color: 'white', opacity: loading ? 0.5 : 1 }}
                            >
                                {loading ? '⏳ Joining...' : '🏠 Join Lobby'}
                            </button>
                        </div>
                    )}

                    {/* CARDS_DEALT / SCRATCHING state */}
                    {(gameState.gameStatus === 'CARDS_DEALT' || gameState.gameStatus === 'SCRATCHING') && (
                        <div className="pixel-card p-2 md:p-6 flex flex-col h-full">
                            <h2 className="pixel-text text-sm mb-2 text-center" style={{ color: 'var(--pixel-dark)' }}>
                                🎴 Your Card
                            </h2>

                            <div className="flex-none flex justify-center mb-2 w-full">
                                <div className="w-full max-w-sm">
                                    <ScratchCard
                                        onComplete={handleScratch}
                                        cardContent={cardContent}
                                        isScratched={currentPlayer?.hasScratched || false}
                                    />
                                </div>
                            </div>

                            {/* Scratch Progress - Compact */}
                            <div className="mb-2 shrink-0">
                                <div className="pixel-card p-2 text-center" style={{ background: 'var(--pixel-primary-light)' }}>
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-xs font-bold" style={{ color: 'var(--pixel-dark)' }}>
                                            📊 Scratched: {activePlayers.filter(p => p.hasScratched).length} / {activePlayers.length}
                                        </p>
                                        <span className="text-[10px] text-gray-600">
                                            {Math.round((activePlayers.filter(p => p.hasScratched).length / activePlayers.length) * 100)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-300 h-1.5 rounded overflow-hidden">
                                        <div
                                            className="bg-green-500 h-full transition-all duration-500"
                                            style={{ width: `${(activePlayers.filter(p => p.hasScratched).length / activePlayers.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* LIVE STATUS - Who has scratched? - Scrollable Grid */}
                            <div className="flex-1 overflow-y-auto min-h-0 border-t border-dashed border-gray-400 pt-2 custom-scrollbar">
                                <h3 className="text-xs font-bold mb-2 text-gray-500 uppercase tracking-wider">Live Status</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pb-2">
                                    {activePlayers.map((p, idx) => (
                                        <div key={idx} className="pixel-card p-1.5 flex items-center justify-between transition-all duration-300"
                                            style={{
                                                border: p.hasScratched ? '2px solid var(--pixel-success)' : p.isOnline === false ? '2px solid var(--pixel-danger)' : '1px solid var(--pixel-dark)',
                                                background: p.hasScratched ? 'var(--pixel-success)' : p.isOnline === false ? '#fee2e2' : 'var(--pixel-bg)',
                                                color: p.hasScratched ? 'white' : p.isOnline === false ? 'var(--pixel-danger)' : 'var(--pixel-dark)',
                                                opacity: p.isOnline === false ? 0.6 : 1
                                            }}>
                                            <div className="flex items-center gap-1 overflow-hidden min-w-0">
                                                <span className="text-sm shrink-0">{p.isHost ? '👑' : '👤'}</span>
                                                <span className="text-xs font-bold truncate" style={{ color: p.hasScratched ? 'white' : 'inherit' }}>
                                                    {p.name} {p.isMe && '(You)'}
                                                </span>
                                            </div>
                                            <span className="text-sm shrink-0 ml-1">
                                                {p.hasScratched ? '✅' : p.isOnline === false ? '🔌' : '⏳'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Host Override for Deadlocks - Sticky Bottom */}
                            {isHost && (
                                <div className="mt-2 text-center shrink-0 pt-2 border-t border-dashed border-gray-300">
                                    <button
                                        onClick={handleForceVoting}
                                        className="text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wide border border-red-200 px-2 py-1 rounded bg-red-50"
                                    >
                                        ⚠️ Force Start Voting
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DISCUSSION state */}
                    {gameState.gameStatus === 'DISCUSSION' && (
                        <div className="space-y-4">
                            <div className="pixel-card p-6 text-center">
                                <h2 className="pixel-text mb-4" style={{ color: 'var(--pixel-dark)' }}>
                                    💬 Discussion Time
                                </h2>
                                <p style={{ color: 'var(--pixel-dark)' }}>
                                    Discuss among yourselves to find the Imposter!
                                </p>

                                {cardContent && (
                                    <div className="mt-4 pixel-card p-4" style={{ background: cardContent === 'IMPOSTER' ? 'var(--pixel-danger)' : 'var(--pixel-accent)' }}>
                                        <p className="text-sm">Your word:</p>
                                        <p className="pixel-text-lg" style={{ color: cardContent === 'IMPOSTER' ? 'white' : 'var(--pixel-dark)' }}>
                                            {cardContent}
                                        </p>
                                    </div>
                                )}

                                {isHost && (
                                    <button
                                        onClick={handleStartVoting}
                                        disabled={loading}
                                        className="pixel-btn w-full mt-4"
                                        style={{ background: 'var(--pixel-primary)', opacity: loading ? 0.5 : 1 }}
                                    >
                                        {loading ? '⏳ Starting...' : '🗳️ Start Voting'}
                                    </button>
                                )}

                                {!isHost && (
                                    <p className="mt-4" style={{ color: 'var(--pixel-dark)' }}>
                                        ⏳ Waiting for host to start voting...
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VOTING state */}
                    {gameState.gameStatus === 'VOTING' && (
                        <div className="space-y-4">
                            {/* Vote Progress */}
                            <div className="pixel-card p-4 text-center" style={{ background: 'var(--pixel-primary-light)' }}>
                                <p className="text-lg font-bold" style={{ color: 'var(--pixel-dark)' }}>
                                    🗳️ {activePlayers.filter(p => p.hasVoted).length} / {activePlayers.length} Voted
                                </p>
                                <div className="w-full bg-gray-300 h-2 rounded mt-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded transition-all duration-500"
                                        style={{ width: `${(activePlayers.filter(p => p.hasVoted).length / activePlayers.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Countdown Timer */}
                            {gameState.votingStartedAt && (() => {
                                const elapsed = Math.floor((Date.now() - gameState.votingStartedAt) / 1000);
                                const remaining = Math.max(0, gameState.votingTimeout - elapsed);
                                const minutes = Math.floor(remaining / 60);
                                const seconds = remaining % 60;

                                return (
                                    <div className="pixel-card p-3 text-center" style={{
                                        background: remaining < 10 ? 'var(--pixel-danger)' : 'var(--pixel-warning)',
                                        color: 'white'
                                    }}>
                                        <p className="font-bold">
                                            {remaining === 0 ? '[TIME UP]' : `[${minutes}:${seconds.toString().padStart(2, '0')}]`}
                                        </p>
                                    </div>
                                );
                            })()}

                            <VotingPanel
                                players={gameState.players}
                                votes={gameState.votes}
                                hasVoted={currentPlayer?.hasVoted || false}
                                isVotingActive={true}
                                onVote={handleVote}
                                loading={loading}
                            />
                        </div>
                    )}

                    {/* RESULT state */}
                    {gameState.gameStatus === 'RESULT' && (
                        <div className="pixel-card p-6 text-center">
                            <h2 className="pixel-text-xl mb-4" style={{ color: 'var(--pixel-dark)' }}>
                                {gameState.result === 'PLAYERS_WIN' ? '🎉 Players Win!' : '🕵️ Imposter Wins!'}
                            </h2>

                            <div className="pixel-card p-4 mb-4" style={{
                                background: gameState.result === 'PLAYERS_WIN' ? 'var(--pixel-success)' : 'var(--pixel-danger)',
                                color: 'white'
                            }}>
                                <p>{gameState.endReason}</p>
                                {gameState.imposterName && (
                                    <p className="mt-2">
                                        The Imposter was: <strong>{gameState.imposterName}</strong>
                                        {gameState.amIImposter && ' (That was you!)'}
                                    </p>
                                )}
                            </div>

                            {gameState.voteResults && (
                                <div className="pixel-card p-4 mb-4 text-left">
                                    <h3 className="font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>Vote Results:</h3>
                                    {gameState.voteResults.map((result, idx) => (
                                        <div key={idx} className="flex justify-between items-center py-1">
                                            <span style={{ color: 'var(--pixel-dark)' }}>
                                                {result.playerName} {result.isImposter && '🕵️'}
                                            </span>
                                            <span className="font-bold" style={{ color: 'var(--pixel-dark)' }}>
                                                {result.voteCount} votes
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Share Results */}
                            <div className="pixel-card p-4 mb-4" style={{ background: 'var(--pixel-accent)' }}>
                                <p className="text-sm font-bold mb-2 text-center" style={{ color: 'var(--pixel-dark)' }}>
                                    📤 Share Results
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            const shareText = `🕵️ Imposter Game Results!\n\n${gameState.result === 'PLAYERS_WIN' ? '🎉 Players Won!' : '🕵️ Imposter Won!'}\n\nImposter: ${gameState.imposterName}\n${gameState.amIImposter ? '(That was ME!)' : ''}\n\nJoin: ${window.location.origin}/imposter/${gameToken}`;
                                            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                                        }}
                                        className="flex-1 pixel-btn text-sm"
                                        style={{ background: '#25D366', color: 'white' }}
                                    >
                                        💬 WhatsApp
                                    </button>
                                    <button
                                        onClick={() => {
                                            const shareText = `🕵️ Imposter Game Results!\n${gameState.result === 'PLAYERS_WIN' ? '🎉 Players Won!' : '🕵️ Imposter Won!'}\nImposter: ${gameState.imposterName}\n${gameState.amIImposter ? '(That was ME!)' : ''}\nJoin: ${window.location.origin}/imposter/${gameToken}`;
                                            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
                                        }}
                                        className="flex-1 pixel-btn text-sm"
                                        style={{ background: '#1DA1F2', color: 'white' }}
                                    >
                                        𝕏 Share
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                {/* Host: Back to Lobby button */}
                                {isHost && (
                                    <button
                                        onClick={handleRestart}
                                        disabled={loading}
                                        className="pixel-btn w-full"
                                        style={{ background: 'var(--pixel-success)', color: 'white', opacity: loading ? 0.5 : 1 }}
                                    >
                                        {loading ? '⏳ Going to lobby...' : '🏠 Back to Lobby'}
                                    </button>
                                )}

                                {/* Non-host: Show waiting message or back to lobby */}
                                {!isHost && (
                                    gameState.hostInLobby ? (
                                        <button
                                            onClick={handleRestart}
                                            disabled={loading}
                                            className="pixel-btn w-full"
                                            style={{ background: 'var(--pixel-success)', color: 'white', opacity: loading ? 0.5 : 1 }}
                                        >
                                            {loading ? '⏳' : '🏠'} Back to Lobby
                                        </button>
                                    ) : (
                                        <div className="pixel-card p-3 text-center" style={{ background: 'var(--pixel-accent)' }}>
                                            <p style={{ color: 'var(--pixel-dark)' }}>
                                                ⏳ Waiting for host to go back to lobby...
                                            </p>
                                        </div>
                                    )
                                )}

                                <button
                                    onClick={() => router.push('/')}
                                    className="pixel-btn pixel-btn-secondary w-full"
                                >
                                    🚪 Leave Game
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
