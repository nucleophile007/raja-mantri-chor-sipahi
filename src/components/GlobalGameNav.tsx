'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface Session {
    type: 'rmcs' | 'imposter';
    gameToken: string;
    playerName: string;
    isHost: boolean;
}

export default function GlobalGameNav() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // Check sessions on mount and when path changes (to hide if in game)
    const checkSessions = useCallback(async () => {
        // 1. Check Imposter (Try localStorage, but also hit API to check Cookies for recovery)
        const imposterId = localStorage.getItem('imposter_playerId');
        const imposterToken = localStorage.getItem('imposter_gameToken');

        try {
            // Always call validation to verify cookie if local storage is missing
            const res = await fetch('/api/imposter/validate-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send what we have, API will fallback to cookie if empty
                body: JSON.stringify({
                    gameToken: imposterToken || undefined,
                    playerId: imposterId || undefined
                })
            });
            const data = await res.json();

            if (data.valid || data.hasSession) {
                setSession({
                    type: 'imposter',
                    gameToken: data.gameToken || data.currentGame?.gameToken,
                    playerName: data.playerName || data.currentGame?.playerName,
                    isHost: data.isHost || data.currentGame?.isHost
                });

                // Heal local storage if it was missing but session exists (Auto-Login logic)
                if ((!imposterId || !imposterToken) && data.playerId) {
                    console.log('GlobalGameNav: Healing local storage from cookie session');
                    localStorage.setItem('imposter_playerId', data.playerId);
                    localStorage.setItem('imposter_gameToken', data.gameToken);
                }
                return;
            } else {
                // Invalid, cleanup
                if (imposterId || imposterToken) {
                    localStorage.removeItem('imposter_playerId');
                    localStorage.removeItem('imposter_gameToken');
                }
            }
        } catch (e) {
            console.error('Failed to validate imposter session', e);
        }

        // 2. Check RMCS (Secondary, only if no Imposter)
        const rmcsId = localStorage.getItem('playerId');
        const rmcsToken = localStorage.getItem('gameToken');

        if (rmcsId && rmcsToken) {
            try {
                const res = await fetch('/api/game/validate-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameToken: rmcsToken, playerId: rmcsId })
                });
                const data = await res.json();
                if (data.valid) {
                    setSession({
                        type: 'rmcs',
                        gameToken: data.gameToken,
                        playerName: data.playerName,
                        isHost: data.isHost
                    });
                    return;
                } else {
                    localStorage.removeItem('playerId');
                    localStorage.removeItem('gameToken');
                }
            } catch (e) {
                console.error('Failed to validate RMCS session', e);
            }
        }

        setSession(null);
    }, []);

    useEffect(() => {
        checkSessions();
    }, [checkSessions, pathname]);

    const handleLeave = async () => {
        if (!session) return;
        if (!confirm('Are you sure you want to leave the active game?')) return;

        setLoading(true);
        try {
            if (session.type === 'imposter') {
                const playerId = localStorage.getItem('imposter_playerId'); // Might be null
                await fetch('/api/imposter/leave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // If playerId is null, send empty/undefined. Backend should use cookie.
                    body: JSON.stringify({ gameToken: session.gameToken, playerId: playerId || undefined })
                });
                localStorage.removeItem('imposter_playerId');
                localStorage.removeItem('imposter_gameToken');
            } else {
                const playerId = localStorage.getItem('playerId');
                await fetch('/api/game/leave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gameToken: session.gameToken, playerId })
                });
                localStorage.removeItem('playerId');
                localStorage.removeItem('gameToken');
            }
            setSession(null);
            router.refresh();
        } catch (e) {
            console.error('Failed to leave game', e);
            alert('Failed to leave game');
        } finally {
            setLoading(false);
        }
    };

    // Don't show if no session OR if we are already IN the game room
    if (!session) return null;

    // Check if we are currently on the game page for this session
    const isIngame =
        (session.type === 'imposter' && pathname?.includes(`/imposter/${session.gameToken}`)) ||
        (session.type === 'rmcs' && pathname?.includes(`/game/${session.gameToken}`));

    if (isIngame) return null;

    return (
        <div className="sticky top-0 left-0 right-0 z-50 p-2 md:p-3 shadow-lg border-b-4 border-black animate-slide-down"
            style={{ background: 'var(--pixel-primary-light)' }}>
            <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl animate-pulse">
                        {session.type === 'imposter' ? '🕵️' : '👑'}
                    </span>
                    <div className="leading-tight">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Active Game</p>
                        <p className="font-bold pixel-text text-sm md:text-base" style={{ color: 'var(--pixel-dark)' }}>
                            {session.gameToken} <span className="text-xs font-normal">({session.playerName})</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => router.push(session.type === 'imposter' ? `/imposter/${session.gameToken}` : `/game/${session.gameToken}`)}
                        className="pixel-btn text-xs md:text-sm py-1 md:py-2 px-2 md:px-4"
                        style={{ background: 'var(--pixel-success)', color: 'white' }}
                        disabled={loading}
                    >
                        ⚡ REJOIN
                    </button>
                    <button
                        onClick={handleLeave}
                        className="pixel-btn text-xs md:text-sm py-1 md:py-2 px-2 md:px-4"
                        style={{ background: 'var(--pixel-danger)', color: 'white' }}
                        disabled={loading}
                    >
                        {loading ? '...' : '🚪 LEAVE'}
                    </button>
                </div>
            </div>
        </div>
    );
}
