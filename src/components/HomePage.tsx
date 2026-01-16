'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [playerName, setPlayerName] = useState('');
  const [gameToken, setGameToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleCreateGame = async () => {
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
        body: JSON.stringify({ playerName: playerName.trim() })
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

  const handleJoinGame = async () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            👑 RMCS Game
          </h1>
          <p className="text-gray-600 text-sm">
            Raja • Mantri • Chor • Sipahi
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              disabled={loading}
            />
          </div>
        </div>

        <button
          onClick={handleCreateGame}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {loading ? 'Creating...' : 'Create New Game'}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">OR</span>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Game Token
            </label>
            <input
              type="text"
              value={gameToken}
              onChange={(e) => setGameToken(e.target.value.toUpperCase())}
              placeholder="Enter game token"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none uppercase"
              disabled={loading}
              maxLength={6}
            />
          </div>

          <button
            onClick={handleJoinGame}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2 text-sm">How to Play:</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Host creates game and shares token</li>
            <li>• 4 players join using the token</li>
            <li>• Characters are randomly assigned</li>
            <li>• Raja gets 1000 points automatically</li>
            <li>• Mantri guesses who the Chor is</li>
            <li>• Correct guess: Mantri 800, Sipahi 500</li>
            <li>• Wrong guess: Chor 800, Sipahi 500</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
