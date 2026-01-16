'use client';

import { useEffect, useState, useCallback, useMemo, useTransition } from 'react';
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
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Memoized derived state (computed only when dependencies change)
  const currentPlayer = useMemo(
    () => gameState?.players.find(p => p.id === playerId),
    [gameState?.players, playerId]
  );
  
  const isMantri = useMemo(() => currentPlayer?.character === 'MANTRI', [currentPlayer?.character]);
  const isHost = useMemo(() => currentPlayer?.isHost || false, [currentPlayer?.isHost]);

  // Initialize playerId from localStorage (runs once on mount)
  useEffect(() => {
    const storedPlayerId = localStorage.getItem('playerId');
    const storedGameToken = localStorage.getItem('gameToken');

    if (!storedPlayerId || storedGameToken !== gameToken) {
      router.push('/');
      return;
    }

    setPlayerId(storedPlayerId);
  }, [gameToken, router]);

  // Memoized callback for Pusher updates
  const handlePusherUpdate = useCallback((newState: GameState) => {
    console.log('📡 Pusher update received:', newState.gameStatus);
    startTransition(() => {
      setGameState(newState);
    });
  }, []);

  // Subscribe to real-time updates via Pusher
  usePusher({
    gameToken,
    onStateUpdate: handlePusherUpdate,
    enabled: !!playerId,
  });

  // Memoized fetch function
  const fetchGameState = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/state?gameToken=${gameToken}`);
      const data = await response.json();

      if (data.success) {
        startTransition(() => {
          setGameState(data.gameState);
        });
      }
    } catch (err) {
      console.error('Error fetching game state:', err);
    }
  }, [gameToken]);

  // Fetch initial game state when playerId is set
  useEffect(() => {
    if (playerId) {
      fetchGameState();
    }
  }, [playerId, fetchGameState]);

  // Memoized action handlers
  const handleDistributeChits = useCallback(async () => {
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
        // Optimistically update local state
        startTransition(() => {
          setGameState(data.gameState);
        });
        setTimeout(() => {
          setAnimating(false);
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
  }, [gameToken, playerId]);

  const handleMantriGuess = useCallback(async () => {
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
        // Optimistically update local state
        startTransition(() => {
          setGameState(data.gameState);
        });
        setSelectedPlayer(null);
      } else {
        setError(data.error || 'Failed to submit guess');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [gameToken, playerId, selectedPlayer]);

  const handleNextRound = useCallback(async () => {
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
        // Optimistically update local state
        startTransition(() => {
          setGameState(data.gameState);
        });
      } else {
        setError(data.error || 'Failed to start next round');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [gameToken, playerId]);

  // Memoized derived value
  const currentRoundResult = useMemo(
    () => gameState?.roundHistory[gameState.roundHistory.length - 1],
    [gameState?.roundHistory]
  );

  // Early return for loading state
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

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

        {/* Share Game Code - Show when waiting for players */}
        {gameState.gameStatus === 'WAITING' && gameState.currentRound === 0 && gameState.players.length < 4 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-2xl shadow-xl p-6 mb-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 mb-2">📱 Share Game Code</h3>
              <div className="bg-white rounded-xl p-4 mb-4 border-2 border-dashed border-purple-300">
                <p className="text-sm text-gray-600 mb-2">Game Code:</p>
                <p className="text-4xl font-bold text-purple-600 tracking-wider mb-3">{gameToken}</p>
                <p className="text-xs text-gray-500">Share this code with your friends to join</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(gameToken);
                    setError('');
                    // Show success feedback
                    const btn = document.activeElement as HTMLButtonElement;
                    const originalText = btn.textContent;
                    btn.textContent = '✓ Copied!';
                    setTimeout(() => {
                      btn.textContent = originalText;
                    }, 2000);
                  } catch (err) {
                    setError('Failed to copy. Please copy manually: ' + gameToken);
                  }
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                📋 Copy Code
              </button>
              <button
                onClick={() => {
                  const message = encodeURIComponent(
                    `🎮 Join my RMCS game!\n\n` +
                    `Game Code: ${gameToken}\n` +
                    `Link: ${window.location.origin}\n\n` +
                    `Enter the code to join!`
                  );
                  window.open(`https://wa.me/?text=${message}`, '_blank');
                }}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Share on WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Waiting for Players - Initial */}
        {gameState.gameStatus === 'WAITING' && gameState.currentRound === 0 && (
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Waiting for Players ({gameState.players.length}/4)
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Game will have <span className="font-bold text-purple-600">{gameState.maxRounds}</span> round{gameState.maxRounds !== 1 ? 's' : ''}
            </p>
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
