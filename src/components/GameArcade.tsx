'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PixelRaja, PixelMantri, PixelChor, PixelSipahi } from './PixelCharacters';

type GameType = 'rmcs' | 'imposter' | null;
type FlowType = 'select' | 'host' | 'join';

interface RMCSSession {
    gameToken: string;
    playerName: string;
    isHost: boolean;
    gameStatus: string;
    currentRound: number;
    maxRounds: number;
    playerCount: number;
}

interface ImposterSession {
    gameToken: string;
    playerName: string;
    isHost: boolean;
    gameStatus: string;
    playerCount: number;
}

export default function GameArcade() {
    const [selectedGame, setSelectedGame] = useState<GameType>(null);
    const [flow, setFlow] = useState<FlowType>('select');
    const [playerName, setPlayerName] = useState('');
    const [gameToken, setGameToken] = useState('');
    const [maxRounds, setMaxRounds] = useState(5);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkingSession, setCheckingSession] = useState(true);
    const [rmcsSession, setRmcsSession] = useState<RMCSSession | null>(null);
    const [imposterSession, setImposterSession] = useState<ImposterSession | null>(null);
    const router = useRouter();

    // Check for existing sessions
    useEffect(() => {
        const checkSessions = async () => {
            // Check RMCS session
            const rmcsPlayerId = localStorage.getItem('playerId');
            const rmcsToken = localStorage.getItem('gameToken');
            if (rmcsPlayerId && rmcsToken) {
                try {
                    const response = await fetch('/api/game/validate-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gameToken: rmcsToken, playerId: rmcsPlayerId })
                    });
                    const data = await response.json();
                    if (data.valid) {
                        setRmcsSession({
                            gameToken: data.gameToken,
                            playerName: data.playerName,
                            isHost: data.isHost,
                            gameStatus: data.gameStatus,
                            currentRound: data.currentRound,
                            maxRounds: data.maxRounds,
                            playerCount: data.playerCount
                        });
                    } else {
                        localStorage.removeItem('playerId');
                        localStorage.removeItem('gameToken');
                    }
                } catch (err) {
                    console.error('Failed to validate RMCS session:', err);
                }
            }

            // Check Imposter session
            const imposterPlayerId = localStorage.getItem('imposter_playerId');
            const imposterToken = localStorage.getItem('imposter_gameToken');
            if (imposterPlayerId && imposterToken) {
                try {
                    const response = await fetch('/api/imposter/validate-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gameToken: imposterToken, playerId: imposterPlayerId })
                    });
                    const data = await response.json();
                    if (data.valid) {
                        setImposterSession({
                            gameToken: data.gameToken,
                            playerName: data.playerName,
                            isHost: data.isHost,
                            gameStatus: data.gameStatus,
                            playerCount: data.playerCount
                        });
                    } else {
                        localStorage.removeItem('imposter_playerId');
                        localStorage.removeItem('imposter_gameToken');
                    }
                } catch (err) {
                    console.error('Failed to validate Imposter session:', err);
                }
            }

            setCheckingSession(false);
        };

        checkSessions();
    }, []);

    // Leave RMCS game
    const handleLeaveRMCS = useCallback(async () => {
        const playerId = localStorage.getItem('playerId');
        const token = localStorage.getItem('gameToken');
        if (!playerId || !token) return;

        setLoading(true);
        try {
            await fetch('/api/game/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameToken: token, playerId })
            });
        } catch (err) {
            console.error('Failed to leave RMCS:', err);
        }
        localStorage.removeItem('playerId');
        localStorage.removeItem('gameToken');
        setRmcsSession(null);
        setLoading(false);
    }, []);

    // Leave Imposter game
    const handleLeaveImposter = useCallback(async () => {
        const playerId = localStorage.getItem('imposter_playerId');
        const token = localStorage.getItem('imposter_gameToken');
        if (!playerId || !token) return;

        setLoading(true);
        try {
            await fetch('/api/imposter/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gameToken: token, playerId })
            });
        } catch (err) {
            console.error('Failed to leave Imposter:', err);
        }
        localStorage.removeItem('imposter_playerId');
        localStorage.removeItem('imposter_gameToken');
        setImposterSession(null);
        setLoading(false);
    }, []);

    const handleHostRMCS = async () => {
        if (rmcsSession || imposterSession) {
            setError('You have an active game. Please leave it first before starting a new one.');
            return;
        }
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/game/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerName: playerName.trim(),
                    maxRounds
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('playerId', data.playerId);
                localStorage.setItem('gameToken', data.gameToken);
                router.push(`/game/${data.gameToken}`);
            } else {
                setError(data.error || 'Failed to create game');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRMCS = async () => {
        if (rmcsSession || imposterSession) {
            setError('You have an active game. Please leave it first before joining a new one.');
            return;
        }
        if (!playerName.trim() || !gameToken.trim()) {
            setError('Please enter your name and game code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/game/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameToken: gameToken.trim().toUpperCase(),
                    playerName: playerName.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('playerId', data.playerId);
                localStorage.setItem('gameToken', gameToken.trim().toUpperCase());
                router.push(`/game/${gameToken.trim().toUpperCase()}`);
            } else {
                setError(data.error || 'Failed to join game');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleHostImposter = async () => {
        if (rmcsSession || imposterSession) {
            setError('You have an active game. Please leave it first before starting a new one.');
            return;
        }
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/imposter/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerName: playerName.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('imposter_playerId', data.playerId);
                localStorage.setItem('imposter_gameToken', data.gameToken);
                router.push(`/imposter/${data.gameToken}`);
            } else {
                setError(data.error || 'Failed to create game');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinImposter = async () => {
        if (rmcsSession || imposterSession) {
            setError('You have an active game. Please leave it first before joining a new one.');
            return;
        }
        if (!playerName.trim() || !gameToken.trim()) {
            setError('Please enter your name and game code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/imposter/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameToken: gameToken.trim().toUpperCase(),
                    playerName: playerName.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('imposter_playerId', data.playerId);
                localStorage.setItem('imposter_gameToken', data.gameToken);
                router.push(`/imposter/${data.gameToken}`);
            } else {
                setError(data.error || 'Failed to join game');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (flow !== 'select') {
            setFlow('select');
        } else if (selectedGame) {
            setSelectedGame(null);
        }
        setError('');
    };

    return (
        <div className="min-h-screen pixel-grid p-4" style={{ background: 'var(--pixel-bg)' }}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-8">
                    <h1 className="pixel-text-xl mb-2" style={{ color: 'var(--pixel-dark)' }}>
                        🎮 Game Arcade
                    </h1>
                    <p className="text-lg" style={{ color: 'var(--pixel-dark)' }}>
                        Play classic party games with friends!
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="pixel-card p-4 mb-6 text-center" style={{ background: 'var(--pixel-danger)', color: 'white' }}>
                        {error}
                        <button onClick={() => setError('')} className="ml-2">✕</button>
                    </div>
                )}


                {/* Active Session Banners Removed - Replaced by GlobalGameNav */}

                {/* Game Selection */}
                {!selectedGame && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* RMCS Game Card */}
                        <button
                            onClick={() => setSelectedGame('rmcs')}
                            className="pixel-card p-6 text-left hover:scale-[1.02] transition-transform cursor-pointer"
                            style={{ border: '4px solid var(--pixel-dark)' }}
                        >
                            <div className="flex justify-center gap-2 mb-4">
                                <PixelRaja size={48} />
                                <PixelMantri size={48} />
                                <PixelChor size={48} />
                                <PixelSipahi size={48} />
                            </div>
                            <h2 className="pixel-text text-center mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                👑 RMCS
                            </h2>
                            <p className="text-sm text-center mb-4" style={{ color: 'var(--pixel-dark)' }}>
                                Raja Mantri Chor Sipahi
                            </p>
                            <div className="flex justify-center gap-4 text-xs" style={{ color: 'var(--pixel-dark)' }}>
                                <span>👥 4 players</span>
                                <span>⏱️ 5-15 min</span>
                            </div>
                        </button>

                        {/* Imposter Game Card */}
                        <button
                            onClick={() => setSelectedGame('imposter')}
                            className="pixel-card p-6 text-left hover:scale-[1.02] transition-transform cursor-pointer"
                            style={{ border: '4px solid var(--pixel-dark)' }}
                        >
                            <div className="flex justify-center mb-4">
                                <span className="text-6xl">🕵️</span>
                            </div>
                            <h2 className="pixel-text text-center mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                🎭 Imposter
                            </h2>
                            <p className="text-sm text-center mb-4" style={{ color: 'var(--pixel-dark)' }}>
                                Find the Imposter among you
                            </p>
                            <div className="flex justify-center gap-4 text-xs" style={{ color: 'var(--pixel-dark)' }}>
                                <span>👥 3-20 players</span>
                                <span>⏱️ 5-10 min</span>
                            </div>
                        </button>
                    </div>
                )}

                {/* RMCS Flow */}
                {selectedGame === 'rmcs' && (
                    <div className="pixel-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <button onClick={handleBack} className="pixel-btn text-sm">← Back</button>
                            <h2 className="pixel-text" style={{ color: 'var(--pixel-dark)' }}>👑 RMCS</h2>
                            <div className="w-16"></div>
                        </div>

                        {flow === 'select' && (
                            <div className="space-y-4">
                                <p className="text-center mb-6" style={{ color: 'var(--pixel-dark)' }}>
                                    The classic Indian card game with roles: Raja, Mantri, Chor, Sipahi!
                                </p>
                                <button
                                    onClick={() => setFlow('host')}
                                    className="w-full pixel-btn"
                                    style={{ background: 'var(--pixel-success)', color: 'white' }}
                                >
                                    🎯 Host New Game
                                </button>
                                <button
                                    onClick={() => setFlow('join')}
                                    className="w-full pixel-btn pixel-btn-secondary"
                                >
                                    👋 Join Game
                                </button>
                            </div>
                        )}

                        {flow === 'host' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        placeholder="Enter your name"
                                        maxLength={20}
                                        className="pixel-input w-full"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                        Number of Rounds: {maxRounds}
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="15"
                                        value={maxRounds}
                                        onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                                        className="pixel-slider w-full"
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    onClick={handleHostRMCS}
                                    disabled={loading || !playerName.trim()}
                                    className="w-full pixel-btn"
                                    style={{
                                        background: 'var(--pixel-success)',
                                        color: 'white',
                                        opacity: loading || !playerName.trim() ? 0.5 : 1
                                    }}
                                >
                                    {loading ? 'Creating...' : '🎮 Create Game'}
                                </button>
                            </div>
                        )}

                        {flow === 'join' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        placeholder="Enter your name"
                                        maxLength={20}
                                        className="pixel-input w-full"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                        Game Code
                                    </label>
                                    <input
                                        type="text"
                                        value={gameToken}
                                        onChange={(e) => setGameToken(e.target.value.toUpperCase())}
                                        placeholder="Enter 6-digit code"
                                        maxLength={6}
                                        className="pixel-input w-full text-center text-2xl tracking-widest"
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    onClick={handleJoinRMCS}
                                    disabled={loading || !playerName.trim() || !gameToken.trim()}
                                    className="w-full pixel-btn"
                                    style={{
                                        background: 'var(--pixel-primary)',
                                        opacity: loading || !playerName.trim() || !gameToken.trim() ? 0.5 : 1
                                    }}
                                >
                                    {loading ? 'Joining...' : '🚀 Join Game'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Imposter Flow */}
                {selectedGame === 'imposter' && (
                    <div className="pixel-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <button onClick={handleBack} className="pixel-btn text-sm">← Back</button>
                            <h2 className="pixel-text" style={{ color: 'var(--pixel-dark)' }}>🕵️ Imposter</h2>
                            <div className="w-16"></div>
                        </div>

                        {flow === 'select' && (
                            <div className="space-y-4">
                                <p className="text-center mb-6" style={{ color: 'var(--pixel-dark)' }}>
                                    One player is the Imposter with a different word. Find them through discussion and voting!
                                </p>
                                <div className="pixel-card p-4 mb-4" style={{ background: 'var(--pixel-primary-light)' }}>
                                    <h3 className="font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>How to Play:</h3>
                                    <ol className="text-sm space-y-1" style={{ color: 'var(--pixel-dark)' }}>
                                        <li>1. Everyone gets a card with the same word</li>
                                        <li>2. One person gets &quot;IMPOSTER&quot; instead</li>
                                        <li>3. Discuss and try to find who doesn&apos;t know the word</li>
                                        <li>4. Vote for who you think is the Imposter!</li>
                                    </ol>
                                </div>

                                {imposterSession ? (
                                    <div className="text-center p-4 border-2 border-dashed" style={{ borderColor: 'var(--pixel-dark)', background: '#fff8dc' }}>
                                        <p className="font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>⚠️ Active Session Found</p>
                                        <p className="text-sm mb-4" style={{ color: 'var(--pixel-dark)' }}>
                                            You are already in game <strong>{imposterSession.gameToken}</strong> as <strong>{imposterSession.playerName}</strong>.
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => router.push(`/imposter/${imposterSession.gameToken}`)}
                                                className="flex-1 pixel-btn pixel-btn-secondary text-sm"
                                            >
                                                ➡️ Rejoin
                                            </button>
                                            <button
                                                onClick={handleLeaveImposter}
                                                className="flex-1 pixel-btn text-sm"
                                                style={{ background: 'var(--pixel-danger)', color: 'white' }}
                                            >
                                                🚪 Leave
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setFlow('host')}
                                            className="w-full pixel-btn"
                                            style={{ background: 'var(--pixel-success)', color: 'white' }}
                                        >
                                            🎯 Host New Game
                                        </button>
                                        <button
                                            onClick={() => setFlow('join')}
                                            className="w-full pixel-btn pixel-btn-secondary"
                                        >
                                            👋 Join Game
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {flow === 'host' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        placeholder="Enter your name"
                                        maxLength={20}
                                        className="pixel-input w-full"
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    onClick={handleHostImposter}
                                    disabled={loading || !playerName.trim()}
                                    className="w-full pixel-btn"
                                    style={{
                                        background: 'var(--pixel-success)',
                                        color: 'white',
                                        opacity: loading || !playerName.trim() ? 0.5 : 1
                                    }}
                                >
                                    {loading ? 'Creating...' : '🎮 Create Game'}
                                </button>
                            </div>
                        )}

                        {flow === 'join' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        placeholder="Enter your name"
                                        maxLength={20}
                                        className="pixel-input w-full"
                                        disabled={loading}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                        Game Code
                                    </label>
                                    <input
                                        type="text"
                                        value={gameToken}
                                        onChange={(e) => setGameToken(e.target.value.toUpperCase())}
                                        placeholder="Enter 6-digit code"
                                        maxLength={6}
                                        className="pixel-input w-full text-center text-2xl tracking-widest"
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    onClick={handleJoinImposter}
                                    disabled={loading || !playerName.trim() || !gameToken.trim()}
                                    className="w-full pixel-btn"
                                    style={{
                                        background: 'var(--pixel-primary)',
                                        opacity: loading || !playerName.trim() || !gameToken.trim() ? 0.5 : 1
                                    }}
                                >
                                    {loading ? 'Joining...' : '🚀 Join Game'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-8 pb-8">
                    <p className="text-sm" style={{ color: 'var(--pixel-dark)' }}>
                        🎲 More games coming soon!
                    </p>
                </div>
            </div>
        </div>
    );
}
