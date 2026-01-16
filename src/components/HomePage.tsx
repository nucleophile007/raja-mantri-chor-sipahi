'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type FlowType = 'initial' | 'host' | 'join';

export default function HomePage() {
  const [flow, setFlow] = useState<FlowType>('initial');
  const [playerName, setPlayerName] = useState('');
  const [gameToken, setGameToken] = useState('');
  const [maxRounds, setMaxRounds] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreateGame = useCallback(async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (maxRounds < 1 || maxRounds > 30) {
      setError('Number of rounds must be between 1 and 30');
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
  }, [playerName, maxRounds, router]);

  const handleJoinGame = useCallback(async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!gameToken.trim()) {
      setError('Please enter game token');
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
  }, [playerName, gameToken, router]);

  // Initial choice screen
  if (flow === 'initial') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-lg mb-6">
              <span className="text-4xl">👑</span>
            </div>
            <h1 className="text-5xl font-bold text-slate-900 mb-3 tracking-tight">
              RMCS Game
            </h1>
            <p className="text-lg text-slate-600">
              Raja • Mantri • Chor • Sipahi
            </p>
          </div>

          {/* Choice Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Host Game Card */}
            <button
              onClick={() => setFlow('host')}
              className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border-2 border-slate-200 hover:border-slate-900 text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-slate-100 group-hover:bg-slate-900 transition-colors duration-300 flex items-center justify-center">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🎮</span>
                </div>
                <svg 
                  className="w-6 h-6 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all duration-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Host Game</h2>
              <p className="text-slate-600">
                Create a new game and invite your friends to join
              </p>
            </button>

            {/* Join Game Card */}
            <button
              onClick={() => setFlow('join')}
              className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border-2 border-slate-200 hover:border-slate-900 text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-xl bg-slate-100 group-hover:bg-slate-900 transition-colors duration-300 flex items-center justify-center">
                  <span className="text-3xl group-hover:scale-110 transition-transform duration-300">🎯</span>
                </div>
                <svg 
                  className="w-6 h-6 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all duration-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Join Game</h2>
              <p className="text-slate-600">
                Enter a game code to join an existing game
              </p>
            </button>
          </div>

          {/* How to Play */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">How to Play</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
              <div className="flex gap-3">
                <span className="text-lg shrink-0">👑</span>
                <div>
                  <strong className="text-slate-900">Raja (King):</strong> Earns 1000 points if Mantri finds the Chor
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-lg shrink-0">🎩</span>
                <div>
                  <strong className="text-slate-900">Mantri (Minister):</strong> Must identify the Chor. Earns 800 points if correct
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-lg shrink-0">🥷</span>
                <div>
                  <strong className="text-slate-900">Chor (Thief):</strong> Avoids detection. Loses 800 if caught, earns 800 if not
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-lg shrink-0">👮</span>
                <div>
                  <strong className="text-slate-900">Sipahi (Police):</strong> Earns 500 if Mantri finds the Chor
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <button
            onClick={() => setFlow('initial')}
            className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-slate-100 mb-4">
                <span className="text-3xl">🎮</span>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Host Game</h2>
              <p className="text-slate-600">Set up a new game for your friends</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none transition-colors"
                  disabled={loading}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateGame()}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Number of Rounds
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
                    disabled={loading}
                  />
                  <div className="w-20 text-center">
                    <div className="text-3xl font-bold text-slate-900">{maxRounds}</div>
                    <div className="text-xs text-slate-500">rounds</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateGame}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Game'
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => setFlow('initial')}
          className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-slate-100 mb-4">
              <span className="text-3xl">🎯</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Join Game</h2>
            <p className="text-slate-600">Enter the game code to join</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Game Code
              </label>
              <input
                type="text"
                value={gameToken}
                onChange={(e) => setGameToken(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-slate-900 focus:outline-none transition-colors uppercase text-center text-2xl font-bold tracking-widest"
                disabled={loading}
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              />
            </div>

            <button
              onClick={handleJoinGame}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Joining...
                </span>
              ) : (
                'Join Game'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
