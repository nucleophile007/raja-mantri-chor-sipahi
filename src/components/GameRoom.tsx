'use client';

import { useEffect, useState, useCallback, useMemo, useTransition, useRef } from 'react';
import { GameState, Character } from '@/types/game';
import { useRouter } from 'next/navigation';
import { usePusher } from '@/hooks/usePusher';
import html2canvas from 'html2canvas';

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
  RAJA: 'bg-amber-100 border-amber-300 text-amber-900',
  MANTRI: 'bg-blue-100 border-blue-300 text-blue-900',
  CHOR: 'bg-red-100 border-red-300 text-red-900',
  SIPAHI: 'bg-emerald-100 border-emerald-300 text-emerald-900'
};

export default function GameRoom({ gameToken }: GameRoomProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const resultsCardRef = useRef<HTMLDivElement>(null);

  // Function to generate and share result image
  const handleShareImage = useCallback(async () => {
    if (!resultsCardRef.current) {
      setError('Results card not found');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const element = resultsCardRef.current;
      
      // Temporarily make element visible for capture
      const originalVisibility = element.style.visibility;
      const originalZIndex = element.style.zIndex;
      element.style.visibility = 'visible';
      element.style.zIndex = '9999';
      
      // Generate canvas from the results card
      const canvas = await html2canvas(element, {
        backgroundColor: '#f8fafc',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 600,
        windowHeight: element.scrollHeight
      });
      
      // Restore original visibility
      element.style.visibility = originalVisibility;
      element.style.zIndex = originalZIndex;

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Failed to convert image');
          setLoading(false);
          return;
        }

        const file = new File([blob], 'rmcs-results.png', { type: 'image/png' });

        // Try to use Web Share API (mobile-friendly)
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'RMCS Game Results',
              text: '🏆 Check out our RMCS game results!'
            });
          } catch (err) {
            // User cancelled or share failed, fallback to download
            if ((err as Error).name !== 'AbortError') {
              downloadImage(canvas);
            }
          }
        } else {
          // Fallback to download
          downloadImage(canvas);
        }
        setLoading(false);
      }, 'image/png');
      
    } catch (err) {
      console.error('Failed to generate image:', err);
      setError(`Failed to generate image: ${(err as Error).message}`);
      setLoading(false);
    }
  }, [gameToken]);

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `rmcs-results-${gameToken}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Memoized derived state (computed only when dependencies change)
  const currentPlayer = useMemo(
    () => gameState?.players.find(p => p.id === playerId),
    [gameState?.players, playerId]
  );
  
  const isMantri = useMemo(() => currentPlayer?.character === 'MANTRI', [currentPlayer?.character]);
  const isHost = useMemo(() => currentPlayer?.isHost || false, [currentPlayer?.isHost]);

  // Initialize playerId from localStorage and attempt reconnection
  useEffect(() => {
    const storedPlayerId = localStorage.getItem('playerId');
    const storedGameToken = localStorage.getItem('gameToken');

    if (!storedPlayerId || storedGameToken !== gameToken) {
      router.push('/');
      return;
    }

    setPlayerId(storedPlayerId);

    // Attempt to reconnect to the game
    const reconnect = async () => {
      try {
        const response = await fetch('/api/game/reconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            gameToken: storedGameToken, 
            playerId: storedPlayerId 
          })
        });

        const data = await response.json();
        
        if (data.success) {
          console.log('✅ Reconnected to game');
        }
      } catch (err) {
        console.error('Failed to reconnect:', err);
      }
    };

    reconnect();
  }, [gameToken, router]);

  // Send heartbeat every 30 seconds to keep player active
  useEffect(() => {
    if (!playerId) return;

    let intervalId: NodeJS.Timeout;

    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/game/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameToken, playerId })
        });
        
        const data = await response.json();
        
        // If game was deleted or player removed, stop sending heartbeats
        if (data.gameDeleted || data.playerRemoved) {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 30 seconds
    intervalId = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(intervalId);
  }, [gameToken, playerId]);

  // Memoized callback for Pusher updates with animation handling
  const handlePusherUpdate = useCallback((newState: GameState) => {
    // Check if current player was removed from the game (another player left and we got the update)
    const currentPlayerStillInGame = newState.players.find(p => p.id === playerId);
    
    // If game ended by host or current player not in game anymore
    if (newState.gameStatus === 'GAME_END' || (playerId && !currentPlayerStillInGame)) {
      let message = 'The game has ended.';
      
      if (newState.players.length === 0) {
        // Game was deleted
        if (gameState && gameState.currentRound > 0) {
          message = 'A player left mid-game. The game has been terminated to prevent score inconsistencies.';
        } else {
          message = 'The host has ended the game.';
        }
      } else if (!currentPlayerStillInGame && playerId) {
        // Current player was removed (shouldn't happen in normal flow, but safety check)
        message = 'You have been removed from the game.';
      }
      
      alert(message + ' Returning to home page.');
      localStorage.removeItem('playerId');
      localStorage.removeItem('gameToken');
      router.push('/');
      return;
    }

    // Auto-trigger animation when status changes to DISTRIBUTING
    if (newState.gameStatus === 'DISTRIBUTING' && gameState?.gameStatus !== 'DISTRIBUTING') {
      setAnimating(true);
      // Auto-clear animation after 2.6 seconds
      setTimeout(() => {
        setAnimating(false);
      }, 2600);
    }
    
    // Stop animation when status changes away from DISTRIBUTING
    if (newState.gameStatus !== 'DISTRIBUTING' && gameState?.gameStatus === 'DISTRIBUTING') {
      setAnimating(false);
    }
    
    startTransition(() => {
      setGameState(newState);
    });
  }, [gameState?.gameStatus, gameState?.currentRound, playerId, router]);

  // Subscribe to real-time updates via Pusher
  usePusher({
    gameToken,
    onStateUpdate: handlePusherUpdate,
    enabled: !!playerId,
  });

  // Auto-transition from DISTRIBUTING to KING_REVEALED after animation
  useEffect(() => {
    if (gameState?.gameStatus === 'DISTRIBUTING' && isHost) {
      const timer = setTimeout(async () => {
        try {
          // Update game status to KING_REVEALED
          const response = await fetch('/api/game/reveal-king', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameToken, playerId })
          });
          
          const data = await response.json();
          if (data.success) {
            // Successfully transitioned
          }
        } catch (err) {
          console.error('Failed to auto-transition:', err);
        }
      }, 2600); // Slightly longer than animation to ensure smooth transition

      return () => clearTimeout(timer);
    }
  }, [gameState?.gameStatus, gameToken, playerId, isHost]);

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
    if (loading) return; // Prevent double-click
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/game/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameToken, playerId })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to distribute');
      }
      // Pusher will handle state update automatically
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [gameToken, playerId, loading]);

  const handleMantriGuess = useCallback(async () => {
    if (!selectedPlayer) {
      setError('Please select a player');
      return;
    }

    if (loading) return; // Prevent double-click

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
        setSelectedPlayer(null);
        // Pusher will handle state update automatically
      } else {
        setError(data.error || 'Failed to submit guess');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [gameToken, playerId, selectedPlayer, loading]);

  const handleNextRound = useCallback(async () => {
    if (loading) return; // Prevent double-click
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/game/next-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameToken, playerId })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to start next round');
      }
      // Pusher will handle state update automatically
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [gameToken, playerId, loading]);

  const handleLeaveGame = useCallback(async () => {
    if (loading) return; // Prevent double-click
    
    // Different warning based on game state
    let confirmMessage = 'Are you sure you want to leave the game?';
    
    if (isHost) {
      confirmMessage = '⚠️ WARNING: You are the HOST. If you leave, the ENTIRE game will be terminated for all players. Are you sure?';
    } else if (gameState && gameState.currentRound > 0) {
      confirmMessage = '⚠️ WARNING: Leaving mid-game will TERMINATE the game for all players to prevent score inconsistencies. Are you sure?';
    } else {
      confirmMessage = 'Are you sure you want to leave the game? You can rejoin if the game hasn\'t started yet.';
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/game/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameToken, playerId })
      });

      const data = await response.json();

      if (data.success) {
        // Clear localStorage
        localStorage.removeItem('playerId');
        localStorage.removeItem('gameToken');
        
        // Redirect to home
        router.push('/');
      } else {
        setError(data.error || 'Failed to leave game');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [gameToken, playerId, router, isHost, gameState, loading]);

  // Memoized derived value
  const currentRoundResult = useMemo(
    () => gameState?.roundHistory[gameState.roundHistory.length - 1],
    [gameState?.roundHistory]
  );

  // Early return for loading state
  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">RMCS Game</h1>
              <p className="text-sm text-gray-600">Round {gameState.currentRound} of {gameState.maxRounds}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 px-6 py-3 rounded-lg">
                <p className="text-xs text-gray-600">Game Token</p>
                <p className="text-2xl font-bold text-slate-900">{gameToken}</p>
              </div>
              <button
                onClick={handleLeaveGame}
                disabled={loading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                title="Leave Game"
              >
                🚪 Leave
              </button>
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
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-6 mb-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 mb-2">📱 Share Game Code</h3>
              <div className="bg-white rounded-xl p-4 mb-4 border-2 border-dashed border-purple-300">
                <p className="text-sm text-gray-600 mb-2">Game Code:</p>
                <p className="text-4xl font-bold text-slate-900 tracking-wider mb-3">{gameToken}</p>
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
                className="flex-1 bg-slate-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                📋 Copy Code
              </button>
              <button
                onClick={() => {
                  const joinLink = `${window.location.origin}/join/${gameToken}`;
                  const message = encodeURIComponent(
                    `🎮 Join my RMCS game!\n\n` +
                    `Click the link below to join automatically:\n` +
                    `${joinLink}\n\n` +
                    `Or use Game Code: ${gameToken}`
                  );
                  window.open(`https://wa.me/?text=${message}`, '_blank');
                }}
                className="flex-1 bg-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
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
              Game will have <span className="font-bold text-slate-900">{gameState.maxRounds}</span> round{gameState.maxRounds !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, index) => {
                const player = gameState.players[index];
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg text-center ${
                      player 
                        ? player.isActive 
                          ? 'bg-green-100 border-2 border-green-500' 
                          : 'bg-gray-100 border-2 border-gray-400 opacity-60'
                        : 'bg-gray-100 border-2 border-dashed border-gray-300'
                    }`}
                  >
                    {player ? (
                      <>
                        <p className="font-semibold text-gray-800">
                          {player.name}
                          {!player.isActive && ' (Disconnected)'}
                        </p>
                        {player.isHost && <span className="text-xs text-slate-900">👑 Host</span>}
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
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
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
                    <div 
                      key={player.id} 
                      className={`flex justify-between items-center bg-white p-3 rounded-lg ${
                        !player.isActive ? 'opacity-50 border-2 border-red-300' : ''
                      }`}
                    >
                      <span className="font-semibold">
                        {index + 1}. {player.name}
                        {!player.isActive && ' ⚠️ Disconnected'}
                      </span>
                      <span className="text-lg font-bold text-slate-900">{player.score}</span>
                    </div>
                  ))}
              </div>
            </div>

            {isHost && (
              <button
                onClick={handleDistributeChits}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
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

        {/* Animating Chits Distribution - Full Screen Overlay */}
        {animating && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md mx-4 text-center transform scale-100 animate-pulse">
              <div className="relative">
                {/* Spinning cards animation */}
                <div className="flex justify-center gap-4 mb-6">
                  <div className="text-6xl animate-spin">🎴</div>
                  <div className="text-6xl animate-bounce">🃏</div>
                  <div className="text-6xl animate-spin" style={{ animationDirection: 'reverse' }}>🎴</div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-3 mb-6 overflow-hidden">
                  <div 
                    className="bg-slate-900 h-full rounded-full animate-progress"
                    style={{
                      animation: 'progress 2.5s ease-in-out forwards'
                    }}
                  />
                </div>
                
                <h2 className="text-3xl font-bold text-slate-900 mb-3">
                  🎲 Distributing Chits...
                </h2>
                <p className="text-slate-600 text-lg">
                  Get ready to see your character!
                </p>
              </div>
            </div>
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
                    className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-all disabled:opacity-50"
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
                  className={`${characterColors[player.character]} p-4 rounded-xl border-2 text-center`}
                >
                  <div className="text-3xl mb-2">{characterEmojis[player.character]}</div>
                  <p className="font-semibold">{player.name}</p>
                  <p className="text-sm font-medium">{player.character}</p>
                  <p className="text-xl font-bold mt-2">+{player.pointsEarned}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-2">Current Scores:</h3>
              <div className="space-y-2">
                {gameState.players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div key={player.id} className="flex justify-between items-center">
                      <span className="font-semibold">
                        {index + 1}. {player.name}
                      </span>
                      <span className="text-lg font-bold text-slate-900">{player.score}</span>
                    </div>
                  ))}
              </div>
            </div>

            {isHost && (
              <button
                onClick={handleNextRound}
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
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
            
            {/* Hidden card for image generation */}
            <div 
              ref={resultsCardRef}
              className="absolute w-[600px] bg-white p-8 rounded-2xl"
              style={{ 
                fontFamily: 'system-ui, -apple-system, sans-serif',
                position: 'absolute',
                left: '0',
                top: '0',
                visibility: 'hidden',
                pointerEvents: 'none',
                zIndex: -1
              }}
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-3">👑</div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">RMCS Game</h1>
                <p className="text-lg text-slate-600">Final Results</p>
              </div>
              
              <div className="bg-slate-100 rounded-xl p-6 mb-6">
                <div className="text-center">
                  <div className="text-5xl mb-2">🥇</div>
                  <p className="text-2xl font-bold text-slate-900">
                    {gameState.players.sort((a, b) => b.score - a.score)[0]?.name}
                  </p>
                  <p className="text-4xl font-bold text-amber-600 mt-2">
                    {gameState.players.sort((a, b) => b.score - a.score)[0]?.score} pts
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                {gameState.players
                  .sort((a, b) => b.score - a.score)
                  .slice(1)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className="flex justify-between items-center p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {index === 0 ? '🥈' : index === 1 ? '🥉' : `${index + 2}.`}
                        </span>
                        <span className="text-xl font-semibold text-slate-900">{player.name}</span>
                      </div>
                      <span className="text-2xl font-bold text-slate-900">{player.score}</span>
                    </div>
                  ))}
              </div>
              
              <div className="text-center pt-4 border-t-2 border-slate-200">
                <p className="text-slate-600 text-sm">Played {gameState.maxRounds} rounds</p>
                <p className="text-slate-900 font-bold mt-2 text-lg">Game Code: {gameToken}</p>
              </div>
            </div>
            
            {/* Visible leaderboard */}
            <div className="space-y-4 mb-6">
              {gameState.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`p-4 rounded-xl border-2 flex justify-between items-center ${
                      index === 0 ? 'bg-amber-50 border-amber-300 text-amber-900' :
                      index === 1 ? 'bg-slate-100 border-slate-300 text-slate-900' :
                      index === 2 ? 'bg-orange-50 border-orange-300 text-orange-900' :
                      'bg-white border-slate-200 text-slate-900'
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

            {/* Share Final Results */}
            <div className="mb-6 space-y-3">
              {/* Share as Image */}
              <button
                onClick={handleShareImage}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-4 px-6 rounded-xl font-semibold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {loading ? 'Generating...' : '📸 Share as Image'}
              </button>
              
              {/* Share on WhatsApp (Text) */}
              <button
                onClick={() => {
                  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
                  const winner = sortedPlayers[0];
                  const scoreList = sortedPlayers
                    .map((p, i) => {
                      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
                      return `${medal} ${p.name}: ${p.score} pts`;
                    })
                    .join('\n');
                  
                  const message = encodeURIComponent(
                    `🏆 RMCS Game - Final Results!\n\n` +
                    `👑 Winner: ${winner.name} with ${winner.score} points!\n\n` +
                    `📊 Final Standings (${gameState.maxRounds} rounds):\n${scoreList}\n\n` +
                    `🎮 Join us for the next game!\n` +
                    `Game Code: ${gameToken}`
                  );
                  window.open(`https://wa.me/?text=${message}`, '_blank');
                }}
                className="w-full bg-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                📤 Share on WhatsApp
              </button>
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-all"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
