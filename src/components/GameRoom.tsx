'use client';

import { useEffect, useState } from 'react';
import { GameState, Player, Character } from '@/types/game';
import { useRouter } from 'next/navigation';
import { usePusher } from '@/hooks/usePusher';

interface GameRoomProps {
  gameToken: string;
}

const characterEmojis: Record<Character, string> = {
  RAJA: '👑',
  MANTRI: '🎩',
  CHOR: '🥷',
  SIPAHI: '👮'
};

const characterColors: Record<Character, string> = {
  RAJA: 'bg-yellow-500',
  MANTRI: 'bg-blue-500',
  CHOR: 'bg-red-500',
  SIPAHI: 'bg-green-500'
};

export default function GameRoom({ gameToken }: GameRoomProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);
  const router = useRouter();

  const currentPlayer = gameState?.players.find(p => p.id === playerId);
  const isMantri = currentPlayer?.character === 'MANTRI';
  const isHost = currentPlayer?.isHost || false;

  // 🎉 Subscribe to real-time updates via Pusher (NO MORE POLLING!)
  usePusher({
    gameToken,
    onStateUpdate: (newState) => {
      console.log('📡 Pusher update received:', newState.gameStatus);
      setGameState(newState);
    },
    enabled: !!playerId, // Only subscribe when player is authenticated
  });

  useEffect(() => {
    const storedPlayerId = localStorage.getItem('playerId');
    const storedGameToken = localStorage.getItem('gameToken');

    if (!storedPlayerId || storedGameToken !== gameToken) {
      router.push('/');
      return;
    }

    setPlayerId(storedPlayerId);
    fetchGameState(); // Initial load only
  }, [gameToken, router]);

  const fetchGameState = async () => {
    try {
      const response = await fetch(`/api/game/state?gameToken=${gameToken}`);
      const data = await response.json();

      if (data.success) {
        setGameState(data.gameState);
      }
    } catch (err) {
      console.error('Error fetching game state:', err);
    }
  };

  const handleDistributeChits = async () => {
    setLoading(true);
    setError('');
    setAnimating(true);

    try {
      const response = await fetch('/api/game/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameToken, playerId })
      });

      const data = await response.json();

      if (data.success) {
        // Optimistically update local state immediately
        setGameState(data.gameState);
        setTimeout(() => {
          setAnimating(false);
          // Fetch again to ensure consistency
          fetchGameState();
        }, 2500);
      } else {
        setError(data.error || 'Failed to distribute');
        setAnimating(false);
      }
    } catch (err) {
      setError('Network error');
      setAnimating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleMantriGuess = async () => {
    if (!selectedPlayer) {
      setError('Please select a player');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/game/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameToken, 
          playerId, 
          guessedPlayerId: selectedPlayer 
        })
      });

      const data = await response.json();

      if (data.success) {
        // Optimistically update local state immediately
        setGameState(data.gameState);
        setSelectedPlayer(null);
        // No need to poll - we have the latest state
      } else {
        setError(data.error || 'Failed to submit guess');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleNextRound = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/game/next-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameToken, playerId })
      });

      const data = await response.json();

      if (data.success) {
        // Optimistically update local state immediately
        setGameState(data.gameState);
        // No need to poll - we have the latest state
      } else {
        setError(data.error || 'Failed to start next round');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const currentRoundResult = gameState.roundHistory[gameState.roundHistory.length - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">RMCS Game</h1>
              <p className="text-sm text-gray-600">Round {gameState.currentRound} of {gameState.maxRounds}</p>
            </div>
            <div className="bg-purple-100 px-6 py-3 rounded-lg">
              <p className="text-xs text-gray-600">Game Token</p>
              <p className="text-2xl font-bold text-purple-600">{gameToken}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Waiting for Players - Initial */}
        {gameState.gameStatus === 'WAITING' && gameState.currentRound === 0 && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Waiting for Players ({gameState.players.length}/4)
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, index) => {
                const player = gameState.players[index];
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg text-center ${
                      player ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 border-2 border-dashed border-gray-300'
                    }`}
                  >
                    {player ? (
                      <>
                        <p className="font-semibold text-gray-800">{player.name}</p>
                        {player.isHost && <span className="text-xs text-purple-600">👑 Host</span>}
                      </>
                    ) : (
                      <p className="text-gray-400">Waiting...</p>
                    )}
                  </div>
                );
              })}
            </div>
            {isHost && gameState.players.length === 4 && (
              <button
                onClick={handleDistributeChits}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Distributing...' : '🎲 Distribute Chits'}
              </button>
            )}
            {!isHost && gameState.players.length === 4 && (
              <div className="text-center text-gray-600">
                Waiting for host to start the game...
              </div>
            )}
          </div>
        )}

        {/* Ready for Next Round */}
        {gameState.gameStatus === 'WAITING' && gameState.currentRound > 0 && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Ready for Round {gameState.currentRound + 1}
            </h2>
            
            {/* Current Scores */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-bold text-gray-800 mb-3 text-center">Current Standings</h3>
              <div className="space-y-2">
                {gameState.players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div key={player.id} className="flex justify-between items-center bg-white p-3 rounded-lg">
                      <span className="font-semibold">
                        {index + 1}. {player.name}
                      </span>
                      <span className="text-lg font-bold text-purple-600">{player.score}</span>
                    </div>
                  ))}
              </div>
            </div>

            {isHost && (
              <button
                onClick={handleDistributeChits}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Distributing...' : '🎲 Distribute Chits'}
              </button>
            )}
            {!isHost && (
              <div className="text-center text-gray-600">
                Waiting for host to distribute chits...
              </div>
            )}
          </div>
        )}

        {/* Animating Chits */}
        {animating && (
          <div className="bg-white rounded-2xl shadow-2xl p-12 mb-4 text-center">
            <div className="animate-bounce text-6xl mb-4">🎴</div>
            <p className="text-xl font-bold text-gray-800">Distributing chits...</p>
          </div>
        )}

        {/* King Revealed / Mantri Guessing */}
        {(gameState.gameStatus === 'KING_REVEALED' || gameState.gameStatus === 'MANTRI_GUESSING') && (
          <div className="space-y-4">
            {/* Your Character */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Your Character</h2>
              {currentPlayer?.character && (
                <div className={`${characterColors[currentPlayer.character]} p-6 rounded-lg text-center`}>
                  <div className="text-6xl mb-2">{characterEmojis[currentPlayer.character]}</div>
                  <p className="text-2xl font-bold text-white">{currentPlayer.character}</p>
                </div>
              )}
            </div>

            {/* All Players */}
            <div className="bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Players</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gameState.players.map((player) => {
                  const showCharacter = 
                    player.character === 'RAJA' || 
                    player.character === 'MANTRI' ||
                    player.id === playerId;

                  return (
                    <div
                      key={player.id}
                      onClick={() => {
                        if (isMantri && player.id !== playerId && player.character !== 'RAJA' && player.character !== 'MANTRI') {
                          setSelectedPlayer(player.id);
                        }
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedPlayer === player.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 bg-white'
                      } ${
                        isMantri && player.id !== playerId && player.character !== 'RAJA' && player.character !== 'MANTRI'
                          ? 'cursor-pointer hover:border-purple-400'
                          : ''
                      }`}
                    >
                      <p className="font-semibold text-gray-800 text-center mb-2">{player.name}</p>
                      <p className="text-sm text-gray-600 text-center">Score: {player.score}</p>
                      {showCharacter && player.character && (
                        <div className="mt-2 text-center">
                          <span className="text-2xl">{characterEmojis[player.character]}</span>
                          <p className="text-xs font-semibold text-gray-700">{player.character}</p>
                        </div>
                      )}
                      {!showCharacter && (
                        <div className="mt-2 text-center text-3xl">❓</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isMantri && (
                <div className="mt-6">
                  <p className="text-center text-gray-700 mb-4 font-semibold">
                    You are the Mantri! Select who you think is the Chor:
                  </p>
                  <button
                    onClick={handleMantriGuess}
                    disabled={loading || !selectedPlayer}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Guess'}
                  </button>
                </div>
              )}

              {!isMantri && (
                <div className="mt-6 text-center text-gray-600">
                  Waiting for Mantri to make a guess...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Round End */}
        {gameState.gameStatus === 'ROUND_END' && currentRoundResult && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Round {currentRoundResult.round} Results</h2>
            
            <div className={`p-4 rounded-lg mb-6 text-center ${
              currentRoundResult.mantriGuessedCorrectly ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <p className="text-lg font-bold">
                {currentRoundResult.mantriGuessedCorrectly 
                  ? '✅ Mantri guessed correctly!' 
                  : '❌ Mantri guessed wrong!'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {currentRoundResult.players.map((player) => (
                <div
                  key={player.id}
                  className={`${characterColors[player.character]} p-4 rounded-lg text-white text-center`}
                >
                  <div className="text-3xl mb-2">{characterEmojis[player.character]}</div>
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-sm">{player.character}</p>
                  <p className="text-xl font-bold mt-2">+{player.pointsEarned}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="font-bold text-gray-800 mb-2">Current Scores:</h3>
              <div className="space-y-2">
                {gameState.players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div key={player.id} className="flex justify-between items-center">
                      <span className="font-semibold">
                        {index + 1}. {player.name}
                      </span>
                      <span className="text-lg font-bold text-purple-600">{player.score}</span>
                    </div>
                  ))}
              </div>
            </div>

            {isHost && (
              <button
                onClick={handleNextRound}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Loading...' : gameState.currentRound >= gameState.maxRounds ? 'View Final Results' : 'Start Next Round'}
              </button>
            )}
            {!isHost && (
              <div className="text-center text-gray-600">
                Waiting for host to start next round...
              </div>
            )}
          </div>
        )}

        {/* Game End */}
        {gameState.gameStatus === 'GAME_END' && (
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">🏆 Game Over!</h2>
            
            <div className="space-y-4 mb-6">
              {gameState.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`p-4 rounded-lg flex justify-between items-center ${
                      index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' :
                      index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                      index === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400' :
                      'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span className="text-xl font-semibold">{player.name}</span>
                    </div>
                    <span className="text-2xl font-bold">{player.score}</span>
                  </div>
                ))}
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
