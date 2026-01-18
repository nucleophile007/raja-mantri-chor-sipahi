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
                `/api/imposter/state?gameToken=${gameToken}&playerId=${playerId}`
            );
            const data = await response.json();

            if (data.success) {
                setGameState(data.gameState);
                setConnectionStatus('connected');

                if (data.gameState.myCard) {
                    setCardContent(data.gameState.myCard);
                }

                // Clear session if game ended
                if (data.gameState.gameStatus === 'RESULT') {
                    localStorage.removeItem('imposter_playerId');
                    localStorage.removeItem('imposter_gameToken');
                }
            } else if (data.error === 'Player not found in game') {
                // Player was removed
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
                    // Show leave notification
                    if (action.playerName) {
                        setMilestoneToast(`[-] ${action.playerName} LEFT`);
                        setTimeout(() => setMilestoneToast(null), 3000);
                    }

                    // Remove player or mark inactive, and update host
                    return {
                        ...prev,
                        amIHost: action.newHostName && prev.myName === action.newHostName ? true : prev.amIHost,
                        players: prev.players.map(p =>
                            p.name === action.playerName
                                ? { ...p, isActive: false }
                                : action.newHostName && p.name === action.newHostName
                                    ? { ...p, isHost: true }
                                    : p
                        )
                    };

                case 'PLAYER_SCRATCHED':
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
        if (connectionState === 'connected') {
            setConnectionStatus('connected');
        } else if (connectionState === 'connecting' || connectionState === 'initialized') {
            setConnectionStatus('connecting');
        } else {
            setConnectionStatus('disconnected');
        }
    }, [connectionState]);

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
                // Optimistic update
                if (gameState) {
                    const updatedPlayers = gameState.players.map(p =>
                        p.isMe ? { ...p, hasScratched: true } : p
                    );
                    setGameState({ ...gameState, players: updatedPlayers, myCard: data.cardContent });
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
                setError(data.error || 'Failed to start game');
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
        <div className="min-h-screen pixel-grid p-4" style={{ background: 'var(--pixel-bg)' }}>
            <div className="max-w-2xl mx-auto">
                {/* Header with connection status */}
                <div className="pixel-card p-4 mb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="pixel-text-lg" style={{ color: 'var(--pixel-dark)' }}>🕵️ Imposter</h1>
                            <p className="text-sm" style={{ color: 'var(--pixel-dark)' }}>
                                Code: {gameToken}
                                <span className="ml-2">
                                    {connectionStatus === 'connected' && '🟢'}
                                    {connectionStatus === 'connecting' && '🟡'}
                                    {connectionStatus === 'disconnected' && '🔴'}
                                </span>
                            </p>
                            {/* Connection Status - Prominent */}
                            <div className="mb-4">
                                <div
                                    className="pixel-card p-2 text-center text-xs font-bold"
                                    style={{
                                        background: connectionStatus === 'connected' ? '#10b981' :
                                            connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444',
                                        color: 'white',
                                        border: '2px solid var(--pixel-dark)',
                                        animation: connectionStatus !== 'connected' ? 'pulse 2s ease-in-out infinite' : 'none'
                                    }}
                                >
                                    {connectionStatus === 'connected' ? '🟢 LIVE' :
                                        connectionStatus === 'connecting' ? '🟡 CONNECTING...' : '🔴 RECONNECTING...'}
                                </div>
                            </div>        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleManualRefresh}
                                className="pixel-btn text-sm"
                                disabled={loading}
                                title="Refresh game state"
                            >
                                🔄
                            </button>
                            <button
                                onClick={handleLeave}
                                className="pixel-btn text-sm"
                                style={{ background: 'var(--pixel-danger)', color: 'white' }}
                            >
                                Leave
                            </button>
                        </div>
                    </div>
                </div>

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
                                        <div className="flex justify-center items-center gap-1">
                                            <span className="text-xl">{player.isHost ? '👑' : '👤'}</span>
                                        </div>
                                        <p className="text-sm font-bold truncate" style={{ color: 'var(--pixel-dark)' }}>
                                            {player.name} {player.isMe && '(You)'}
                                        </p>
                                    </div>
                                ))}
                            </div>

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
                                    className="pixel-btn text-xs p-2"
                                    style={{ background: '#25D366', color: 'white' }}
                                >
                                    💬 WhatsApp
                                </button>
                                <button
                                    onClick={() => {
                                        const shareText = `🕵️ Join my Imposter game!\nCode: ${gameToken}\n${window.location.origin}/imposter/${gameToken}`;
                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
                                    }}
                                    className="pixel-btn text-xs p-2"
                                    style={{ background: '#1DA1F2', color: 'white' }}
                                >
                                    𝕏 Share
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(gameToken);
                                        setMilestoneToast('[COPIED] CODE SAVED TO CLIPBOARD');
                                        setTimeout(() => setMilestoneToast(null), 2000);
                                    }}
                                    className="pixel-btn text-xs p-2"
                                >
                                    📋 Copy
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
                    <div className="pixel-card p-6">
                        <h2 className="pixel-text mb-4 text-center" style={{ color: 'var(--pixel-dark)' }}>
                            🎴 Your Card
                        </h2>
                        <ScratchCard
                            onComplete={handleScratch}
                            cardContent={cardContent}
                            isScratched={currentPlayer?.hasScratched || false}
                        />

                        {/* Scratch Progress */}
                        <div className="mt-4">
                            <div className="pixel-card p-3 text-center" style={{ background: 'var(--pixel-primary-light)' }}>
                                <p className="text-lg font-bold" style={{ color: 'var(--pixel-dark)' }}>
                                    📊 {activePlayers.filter(p => p.hasScratched).length} / {activePlayers.length} Scratched
                                </p>
                                <div className="w-full bg-gray-300 h-2 rounded mt-2">
                                    <div
                                        className="bg-green-500 h-2 rounded transition-all duration-500"
                                        style={{ width: `${(activePlayers.filter(p => p.hasScratched).length / activePlayers.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
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
        </div >
    );
}
