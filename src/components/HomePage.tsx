'use client';

import { useState, useCallback, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PixelRaja, PixelMantri, PixelChor, PixelSipahi, PixelDice } from './PixelCharacters';

type FlowType = 'initial' | 'host' | 'join';

interface ActiveSession {
  gameToken: string;
  playerName: string;
  isHost: boolean;
  gameStatus: string;
  currentRound: number;
  maxRounds: number;
  playerCount: number;
}

export default function HomePage() {
  const [flow, setFlow] = useState<FlowType>('initial');
  const [playerName, setPlayerName] = useState('');
  const [gameToken, setGameToken] = useState('');
  const [maxRounds, setMaxRounds] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for existing active session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const storedPlayerId = localStorage.getItem('playerId');
      const storedGameToken = localStorage.getItem('gameToken');

      if (!storedPlayerId || !storedGameToken) {
        setCheckingSession(false);
        return;
      }

      try {
        const response = await fetch('/api/game/validate-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameToken: storedGameToken,
            playerId: storedPlayerId
          })
        });
        const data = await response.json();

        if (data.valid) {
          setActiveSession({
            gameToken: data.gameToken,
            playerName: data.playerName,
            isHost: data.isHost,
            gameStatus: data.gameStatus,
            currentRound: data.currentRound,
            maxRounds: data.maxRounds,
            playerCount: data.playerCount
          });
        } else {
          // Session is invalid - clear it
          localStorage.removeItem('playerId');
          localStorage.removeItem('gameToken');
        }
      } catch (err) {
        // On error, don't block - just hide the banner
        console.error('Failed to validate session:', err);
      }
      setCheckingSession(false);
    };

    checkExistingSession();
  }, []);

  // Check for game code in URL parameters
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setGameToken(codeFromUrl.toUpperCase());
      setFlow('join');
    }
  }, [searchParams]);

  const handleRejoinGame = () => {
    if (activeSession) {
      router.push(`/game/${activeSession.gameToken}`);
    }
  };

  const handleLeaveGame = async () => {
    if (!activeSession) return;

    setLoading(true);
    try {
      const storedPlayerId = localStorage.getItem('playerId');
      await fetch('/api/game/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameToken: activeSession.gameToken,
          playerId: storedPlayerId
        })
      });
    } catch (err) {
      console.error('Failed to leave game:', err);
    }

    localStorage.removeItem('playerId');
    localStorage.removeItem('gameToken');
    setActiveSession(null);
    setLoading(false);
  };

  const handleCreateGame = useCallback(async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (maxRounds < 1 || maxRounds > 30) {
      setError('Number of rounds must be between 1 and 30');
      return;
    }

    // Check for active session
    if (activeSession) {
      setError('You have an active game. Please leave it first before creating a new one.');
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
          maxRounds: maxRounds
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('playerId', data.playerId);
        localStorage.setItem('gameToken', data.gameToken);
        startTransition(() => {
          router.push(`/game/${data.gameToken}`);
        });
      } else {
        setError(data.error || 'Failed to create game');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [playerName, maxRounds, router, activeSession]);

  const handleJoinGame = useCallback(async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!gameToken.trim()) {
      setError('Please enter game token');
      return;
    }

    // Check for active session
    if (activeSession && activeSession.gameToken !== gameToken.trim().toUpperCase()) {
      setError('You have an active game. Please leave it first before joining a different one.');
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
        startTransition(() => {
          router.push(`/game/${gameToken.trim().toUpperCase()}`);
        });
      } else {
        setError(data.error || 'Failed to join game');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [playerName, gameToken, router, activeSession]);

  // Active Session Banner Component
  const ActiveGameBanner = () => {
    if (checkingSession || !activeSession) return null;

    return (
      <div className="pixel-card p-4 mb-6" style={{ background: 'var(--pixel-accent)', borderColor: 'var(--pixel-dark)' }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PixelDice size={32} />
            <div>
              <p className="font-bold" style={{ color: 'var(--pixel-dark)' }}>
                Active Game: {activeSession.gameToken}
              </p>
              <p className="text-sm" style={{ color: 'var(--pixel-dark)' }}>
                Playing as {activeSession.playerName} {activeSession.isHost && '(Host)'} •
                Round {activeSession.currentRound}/{activeSession.maxRounds} •
                {activeSession.playerCount}/4 players
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRejoinGame}
              className="pixel-btn pixel-btn-secondary text-sm"
              disabled={loading}
            >
              ➡️ Rejoin
            </button>
            <button
              onClick={handleLeaveGame}
              className="pixel-btn text-sm"
              style={{ background: 'var(--pixel-danger)', color: 'white', opacity: loading ? 0.5 : 1 }}
              disabled={loading}
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Initial choice screen
  if (flow === 'initial') {
    return (
      <div className="min-h-screen pixel-grid p-4 flex items-center justify-center" style={{ background: 'var(--pixel-bg)' }}>
        <div className="w-full max-w-4xl">
          {/* Active Game Banner */}
          <ActiveGameBanner />

          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="pixel-float">
                <PixelRaja size={80} />
              </div>
            </div>
            <h1 className="pixel-text-xl mb-4" style={{ color: 'var(--pixel-dark)' }}>
              RMCS Game
            </h1>
            <p className="text-lg" style={{ color: 'var(--pixel-dark)' }}>
              Raja • Mantri • Chor • Sipahi
            </p>
          </div>

          {/* Choice Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Host Game Card */}
            <button
              onClick={() => setFlow('host')}
              className="pixel-card pixel-card-hover p-8 text-left group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-16 flex items-center justify-center">
                  <PixelDice size={48} />
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <h2 className="pixel-text-lg mb-2" style={{ color: 'var(--pixel-dark)' }}>Host Game</h2>
              <p style={{ color: 'var(--pixel-dark)' }}>
                Create a new game and invite your friends to join
              </p>
            </button>

            {/* Join Game Card */}
            <button
              onClick={() => setFlow('join')}
              className="pixel-card pixel-card-hover p-8 text-left group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-16 flex items-center justify-center">
                  <PixelMantri size={48} />
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </div>
              <h2 className="pixel-text-lg mb-2" style={{ color: 'var(--pixel-dark)' }}>Join Game</h2>
              <p style={{ color: 'var(--pixel-dark)' }}>
                Enter a game code to join an existing game
              </p>
            </button>
          </div>

          {/* How to Play */}
          <div className="pixel-card p-6">
            <h3 className="pixel-text mb-4" style={{ color: 'var(--pixel-dark)' }}>How to Play</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm" style={{ color: 'var(--pixel-dark)' }}>
              <div className="flex gap-3 items-start">
                <PixelRaja size={32} />
                <div>
                  <strong>Raja (King):</strong> Earns 1000 points if Mantri finds the Chor
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <PixelMantri size={32} />
                <div>
                  <strong>Mantri (Minister):</strong> Must identify the Chor. Earns 800 points if correct
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <PixelChor size={32} />
                <div>
                  <strong>Chor (Thief):</strong> Avoids detection. Loses 800 if caught, earns 800 if not
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <PixelSipahi size={32} />
                <div>
                  <strong>Sipahi (Police):</strong> Earns 500 if Mantri finds the Chor
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Host Game Flow
  if (flow === 'host') {
    return (
      <div className="min-h-screen pixel-grid p-4 flex items-center justify-center" style={{ background: 'var(--pixel-bg)' }}>
        <div className="w-full max-w-md">
          {/* Active Game Banner */}
          <ActiveGameBanner />

          {/* Back Button */}
          <button
            onClick={() => setFlow('initial')}
            className="mb-6 flex items-center gap-2 pixel-btn pixel-btn-secondary"
          >
            ← Back
          </button>

          <div className="pixel-card p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center mb-4">
                <PixelDice size={64} />
              </div>
              <h2 className="pixel-text-lg mb-2" style={{ color: 'var(--pixel-dark)' }}>Host Game</h2>
              <p style={{ color: 'var(--pixel-dark)' }}>Set up a new game for your friends</p>
            </div>

            {error && (
              <div className="pixel-error mb-6">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full pixel-input"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateGame()}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                  Number of Rounds
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                    className="flex-1 pixel-range"
                    disabled={loading}
                  />
                  <div className="text-center px-4 py-2 pixel-score">
                    <div className="text-2xl font-bold" style={{ color: 'var(--pixel-dark)' }}>{maxRounds}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateGame}
                disabled={loading}
                className="w-full pixel-btn pixel-btn-accent"
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="pixel-spinner"></div>
                    Creating...
                  </span>
                ) : (
                  '🎲 Create Game'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Join Game Flow
  return (
    <div className="min-h-screen pixel-grid p-4 flex items-center justify-center" style={{ background: 'var(--pixel-bg)' }}>
      <div className="w-full max-w-md">
        {/* Active Game Banner */}
        <ActiveGameBanner />

        {/* Back Button */}
        <button
          onClick={() => setFlow('initial')}
          className="mb-6 flex items-center gap-2 pixel-btn pixel-btn-secondary"
        >
          ← Back
        </button>

        <div className="pixel-card p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <PixelMantri size={64} />
            </div>
            <h2 className="pixel-text-lg mb-2" style={{ color: 'var(--pixel-dark)' }}>Join Game</h2>
            <p style={{ color: 'var(--pixel-dark)' }}>Enter the game code to join</p>
          </div>

          {error && (
            <div className="pixel-error mb-6">
              {error}
            </div>
          )}

          {searchParams.get('code') && (
            <div className="pixel-success mb-6 flex items-start gap-2">
              <span>✓</span>
              <div>
                <p className="font-bold">Game code loaded!</p>
                <p className="text-xs mt-1">Just enter your name to join the game</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full pixel-input"
                disabled={loading}
                autoFocus={!!searchParams.get('code')}
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
                placeholder="XXXXXX"
                className="w-full pixel-input text-center text-2xl tracking-widest uppercase"
                disabled={loading}
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              />
            </div>

            <button
              onClick={handleJoinGame}
              disabled={loading}
              className="w-full pixel-btn pixel-btn-accent"
              style={{ opacity: loading ? 0.5 : 1 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="pixel-spinner"></div>
                  Joining...
                </span>
              ) : (
                '🎮 Join Game'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
