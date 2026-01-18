'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ImposterRoom from '@/components/ImposterRoom';

export default function ImposterGamePage() {
    const params = useParams();
    const router = useRouter();
    const code = (params.code as string).toUpperCase();

    const [playerId, setPlayerId] = useState<string | null>(null);
    const [playerName, setPlayerName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(true);

    // Check for existing session
    useEffect(() => {
        const storedPlayerId = localStorage.getItem('imposter_playerId');
        const storedGameToken = localStorage.getItem('imposter_gameToken');

        if (storedPlayerId && storedGameToken === code) {
            // Valid session for this game
            setPlayerId(storedPlayerId);
            setChecking(false);
        } else if (storedPlayerId && storedGameToken && storedGameToken !== code) {
            // Session exists for a different game
            setError(`You're already in game ${storedGameToken}. Leave that game first or clear your session.`);
            setChecking(false);
        } else {
            // No session, need to join
            setChecking(false);
        }
    }, [code]);

    const handleJoin = async () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/imposter/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gameToken: code,
                    playerName: playerName.trim()
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('imposter_playerId', data.playerId);
                localStorage.setItem('imposter_gameToken', code);
                setPlayerId(data.playerId);
            } else {
                setError(data.error || 'Failed to join game');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Show game room if player has valid session
    if (playerId) {
        return <ImposterRoom gameToken={code} />;
    }

    // Show loading while checking session
    if (checking) {
        return (
            <div className="min-h-screen pixel-grid flex items-center justify-center" style={{ background: 'var(--pixel-bg)' }}>
                <div className="text-center">
                    <div className="pixel-spinner mx-auto mb-4"></div>
                    <p className="pixel-text" style={{ color: 'var(--pixel-dark)' }}>Checking session...</p>
                </div>
            </div>
        );
    }

    // Show join form
    return (
        <div className="min-h-screen pixel-grid p-4" style={{ background: 'var(--pixel-bg)' }}>
            <div className="max-w-md mx-auto pt-12">
                <div className="pixel-card p-6">
                    <div className="text-center mb-6">
                        <span className="text-6xl">🕵️</span>
                        <h1 className="pixel-text mt-4" style={{ color: 'var(--pixel-dark)' }}>
                            Join Imposter Game
                        </h1>
                        <p className="pixel-token text-2xl mt-2">{code}</p>
                    </div>

                    {error && (
                        <div className="pixel-card p-3 mb-4" style={{ background: 'var(--pixel-danger)', color: 'white' }}>
                            {error}
                            {error.includes('already in game') && (
                                <button
                                    onClick={() => router.push('/')}
                                    className="pixel-btn text-sm mt-2 w-full"
                                >
                                    Go to Home
                                </button>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                                placeholder="Enter your name"
                                maxLength={20}
                                className="pixel-input w-full"
                                disabled={loading}
                                autoFocus
                            />
                        </div>

                        <button
                            onClick={handleJoin}
                            disabled={loading || !playerName.trim()}
                            className="w-full pixel-btn"
                            style={{
                                background: 'var(--pixel-success)',
                                color: 'white',
                                opacity: loading || !playerName.trim() ? 0.5 : 1
                            }}
                        >
                            {loading ? '⏳ Joining...' : '🎮 Join Game'}
                        </button>

                        <button
                            onClick={() => router.push('/')}
                            className="w-full pixel-btn pixel-btn-secondary text-sm"
                        >
                            ← Back to Arcade
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
