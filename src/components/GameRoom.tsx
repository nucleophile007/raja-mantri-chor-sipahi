'use client';

import React from 'react';

import { useEffect, useState, useCallback, useMemo, useTransition, useRef } from 'react';
import { GameState, Character } from '@/types/game';
import { useRouter } from 'next/navigation';
import { usePusher } from '@/hooks/usePusher';
import html2canvas from 'html2canvas';
import { PixelRaja, PixelMantri, PixelChor, PixelSipahi, PixelQuestionMark, PixelCoin } from './PixelCharacters';
import ChitMixAnimation from './ChitMixAnimation';

interface GameRoomProps {
  gameToken: string;
}

const characterComponents: Record<Character, React.FC<{ size?: number }>> = {
  RAJA: PixelRaja,
  MANTRI: PixelMantri,
  CHOR: PixelChor,
  SIPAHI: PixelSipahi
};

const characterCardClasses: Record<Character, string> = {
  RAJA: 'pixel-card-raja',
  MANTRI: 'pixel-card-mantri',
  CHOR: 'pixel-card-chor',
  SIPAHI: 'pixel-card-sipahi'
};

export default function GameRoom({ gameToken }: GameRoomProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animating, setAnimating] = useState(false);
  const [showChitAnimation, setShowChitAnimation] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const resultsCardRef = useRef<HTMLDivElement>(null);

  // Function to generate and share result image
  const handleShareImage = useCallback(async () => {
    if (!resultsCardRef.current || !gameState) {
      setError('Results not available');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const element = resultsCardRef.current;

      // Make element visible for capture
      element.style.visibility = 'visible';
      element.style.position = 'fixed';
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '9999';

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        backgroundColor: '#fef6e4',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: 600,
        height: element.scrollHeight
      });

      // Hide element again
      element.style.visibility = 'hidden';
      element.style.position = 'absolute';
      element.style.zIndex = '-1';

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Failed to generate image');
          setLoading(false);
          return;
        }

        const file = new File([blob], 'rmcs-results.png', { type: 'image/png' });

        // Try native share first (mobile)
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'RMCS Game Results',
              text: '🏆 Check out our RMCS game results!'
            });
            setLoading(false);
            return;
          } catch (err) {
            if ((err as Error).name === 'AbortError') {
              setLoading(false);
              return;
            }
          }
        }

        // Fallback: download the image
        downloadImage(canvas);
        setLoading(false);
      }, 'image/png');

    } catch (err) {
      console.error('Failed to generate image:', err);
      setError(`Failed to generate image. Try WhatsApp share instead.`);
      setLoading(false);
    }
  }, [gameState]);

  const downloadImage = (canvas: HTMLCanvasElement) => {
    const link = document.createElement('a');
    link.download = `rmcs-results-${gameToken}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const currentPlayer = useMemo(
    () => gameState?.players.find(p => p.id === playerId),
    [gameState?.players, playerId]
  );

  const isMantri = useMemo(() => currentPlayer?.character === 'MANTRI', [currentPlayer?.character]);
  const isHost = useMemo(() => currentPlayer?.isHost || false, [currentPlayer?.isHost]);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem('playerId');
    const storedGameToken = localStorage.getItem('gameToken');

    if (!storedPlayerId || storedGameToken !== gameToken) {
      router.push('/');
      return;
    }

    setPlayerId(storedPlayerId);

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

        if (data.gameDeleted || data.playerRemoved) {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Heartbeat failed:', err);
      }
    };

    sendHeartbeat();
    intervalId = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(intervalId);
  }, [gameToken, playerId]);

  const handlePusherUpdate = useCallback((newState: GameState) => {
    const currentPlayerStillInGame = newState.players.find(p => p.id === playerId);

    if (newState.gameStatus === 'GAME_END' || (playerId && !currentPlayerStillInGame)) {
      let message = 'The game has ended.';

      if (newState.players.length === 0) {
        if (gameState && gameState.currentRound > 0) {
          message = 'A player left mid-game. The game has been terminated to prevent score inconsistencies.';
        } else {
          message = 'The host has ended the game.';
        }
      } else if (!currentPlayerStillInGame && playerId) {
        message = 'You have been removed from the game.';
      }

      alert(message + ' Returning to home page.');
      localStorage.removeItem('playerId');
      localStorage.removeItem('gameToken');
      router.push('/');
      return;
    }

    // Show chit animation when status changes to DISTRIBUTING
    if (newState.gameStatus === 'DISTRIBUTING' && gameState?.gameStatus !== 'DISTRIBUTING') {
      setShowChitAnimation(true);
      setAnimating(true);
    }

    if (newState.gameStatus !== 'DISTRIBUTING' && gameState?.gameStatus === 'DISTRIBUTING') {
      setAnimating(false);
    }

    startTransition(() => {
      setGameState(newState);
    });
  }, [gameState?.gameStatus, gameState?.currentRound, playerId, router]);

  usePusher({
    gameToken,
    onStateUpdate: handlePusherUpdate,
    enabled: !!playerId,
  });

  useEffect(() => {
    if (gameState?.gameStatus === 'DISTRIBUTING' && isHost) {
      const timer = setTimeout(async () => {
        try {
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
      }, 8500); // Wait for chit animation to complete

      return () => clearTimeout(timer);
    }
  }, [gameState?.gameStatus, gameToken, playerId, isHost]);

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

  useEffect(() => {
    if (playerId) {
      fetchGameState();
    }
  }, [playerId, fetchGameState]);

  const handleDistributeChits = useCallback(async () => {
    if (loading) return;

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

    if (loading) return;

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
    if (loading) return;

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
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [gameToken, playerId, loading]);

  const handleLeaveGame = useCallback(async () => {
    if (loading) return;

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
        localStorage.removeItem('playerId');
        localStorage.removeItem('gameToken');
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

  const currentRoundResult = useMemo(
    () => gameState?.roundHistory[gameState.roundHistory.length - 1],
    [gameState?.roundHistory]
  );

  // Handle chit animation complete
  const handleChitAnimationComplete = useCallback(() => {
    setShowChitAnimation(false);
  }, []);

  if (!gameState) {
    return (
      <div className="min-h-screen pixel-grid flex items-center justify-center" style={{ background: 'var(--pixel-bg)' }}>
        <div className="text-center">
          <div className="pixel-spinner mx-auto mb-4"></div>
          <p className="pixel-text" style={{ color: 'var(--pixel-dark)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pixel-grid p-4" style={{ background: 'var(--pixel-bg)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="pixel-card p-6 mb-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="pixel-text-lg" style={{ color: 'var(--pixel-dark)' }}>RMCS Game</h1>
              <p className="text-sm" style={{ color: 'var(--pixel-dark)' }}>
                Round {gameState.currentRound} of {gameState.maxRounds}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="pixel-token">
                {gameToken}
              </div>
              <button
                onClick={handleLeaveGame}
                disabled={loading}
                className="pixel-btn"
                style={{ background: 'var(--pixel-danger)', color: 'white', opacity: loading ? 0.5 : 1 }}
              >
                🚪 Leave
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="pixel-error mb-4">
            {error}
          </div>
        )}

        {/* Share Game Code - Show when waiting for players */}
        {gameState.gameStatus === 'WAITING' && gameState.currentRound === 0 && gameState.players.length < 4 && (
          <div className="pixel-card p-6 mb-4">
            <div className="text-center mb-4">
              <h3 className="pixel-text mb-2" style={{ color: 'var(--pixel-dark)' }}>📱 Share Game Code</h3>
              <div className="p-4 mb-4" style={{ border: '4px dashed var(--pixel-primary)' }}>
                <p className="text-sm mb-2" style={{ color: 'var(--pixel-dark)' }}>Game Code:</p>
                <p className="pixel-token mb-3">{gameToken}</p>
                <p className="text-xs" style={{ color: 'var(--pixel-dark)' }}>Share this code with your friends to join</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(gameToken);
                      setError('');
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
                  className="flex-1 pixel-btn"
                >
                  📋 Copy Code
                </button>
                <button
                  onClick={() => {
                    const joinLink = `${window.location.origin}/join/${gameToken}`;
                    const message = encodeURIComponent(
                      `🎮 Join my RMCS game!\n\n` +
                      `Click to join: ${joinLink}\n\n` +
                      `Or use Code: ${gameToken}\n\n` +
                      `🎲 RMCS - The classic Indian card game!\n` +
                      `Play Raja Mantri Chor Sipahi online with friends`
                    );
                    window.open(`https://wa.me/?text=${message}`, '_blank');
                  }}
                  className="flex-1 pixel-btn"
                  style={{ background: '#25D366', color: 'white' }}
                >
                  📤 WhatsApp
                </button>
              </div>
              <button
                onClick={() => {
                  const joinLink = `${window.location.origin}/join/${gameToken}`;
                  const tweet = encodeURIComponent(
                    `🎮 Join my RMCS game!\n\n` +
                    `${joinLink}\n\n` +
                    `Code: ${gameToken}\n\n` +
                    `#RMCS #RajaMantriChorSipahi #IndianGames`
                  );
                  window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
                }}
                className="pixel-btn"
                style={{ background: '#000000', color: 'white' }}
              >
                𝕏 Share on X
              </button>
            </div>
          </div>
        )}

        {/* Waiting for Players - Initial */}
        {gameState.gameStatus === 'WAITING' && gameState.currentRound === 0 && (
          <div className="pixel-card p-6 mb-4">
            <h2 className="pixel-text mb-2" style={{ color: 'var(--pixel-dark)' }}>
              Waiting for Players ({gameState.players.length}/4)
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--pixel-dark)' }}>
              Game will have <span className="font-bold">{gameState.maxRounds}</span> round{gameState.maxRounds !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, index) => {
                const player = gameState.players[index];
                return (
                  <div
                    key={index}
                    className={`pixel-player-slot ${player
                      ? player.isActive
                        ? ''
                        : 'opacity-60'
                      : 'pixel-player-slot-empty pixel-player-slot-waiting'
                      }`}
                    style={player && player.isActive ? { borderColor: 'var(--pixel-success)' } : {}}
                  >
                    {player ? (
                      <>
                        <div className="mb-2">
                          <PixelQuestionMark size={48} />
                        </div>
                        <p className="font-bold text-sm" style={{ color: 'var(--pixel-dark)' }}>
                          {player.name}
                          {!player.isActive && ' ⚠️'}
                        </p>
                        {player.isHost && <span className="pixel-badge pixel-badge-accent mt-2">Host</span>}
                      </>
                    ) : (
                      <p style={{ color: 'var(--pixel-dark)', opacity: 0.5 }}>Waiting...</p>
                    )}
                  </div>
                );
              })}
            </div>
            {isHost && gameState.players.length === 4 && (
              <button
                onClick={handleDistributeChits}
                disabled={loading}
                className="w-full pixel-btn pixel-btn-accent"
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                {loading ? 'Distributing...' : '🎲 Distribute Chits'}
              </button>
            )}
            {!isHost && gameState.players.length === 4 && (
              <div className="text-center" style={{ color: 'var(--pixel-dark)' }}>
                Waiting for host to start the game...
              </div>
            )}
          </div>
        )}

        {/* Ready for Next Round */}
        {gameState.gameStatus === 'WAITING' && gameState.currentRound > 0 && (
          <div className="pixel-card p-6 mb-4">
            <h2 className="pixel-text mb-4 text-center" style={{ color: 'var(--pixel-dark)' }}>
              Ready for Round {gameState.currentRound + 1}
            </h2>

            {/* Current Scores */}
            <div className="p-4 mb-6" style={{ background: 'var(--pixel-bg)', border: '4px solid var(--pixel-dark)' }}>
              <h3 className="font-bold mb-3 text-center" style={{ color: 'var(--pixel-dark)' }}>Current Standings</h3>
              <div className="space-y-2">
                {gameState.players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className="flex justify-between items-center p-3"
                      style={{
                        background: 'white',
                        border: '3px solid var(--pixel-dark)',
                        opacity: player.isActive ? 1 : 0.5
                      }}
                    >
                      <span className="font-bold" style={{ color: 'var(--pixel-dark)' }}>
                        {index + 1}. {player.name}
                        {!player.isActive && ' ⚠️'}
                      </span>
                      <span className="pixel-score">{player.score}</span>
                    </div>
                  ))}
              </div>
            </div>

            {isHost && (
              <button
                onClick={handleDistributeChits}
                disabled={loading}
                className="w-full pixel-btn pixel-btn-accent"
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                {loading ? 'Distributing...' : '🎲 Distribute Chits'}
              </button>
            )}
            {!isHost && (
              <div className="text-center" style={{ color: 'var(--pixel-dark)' }}>
                Waiting for host to distribute chits...
              </div>
            )}
          </div>
        )}

        {/* Chit Mix Animation Overlay */}
        {showChitAnimation && (
          <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
              <ChitMixAnimation onComplete={handleChitAnimationComplete} autoPlay={true} />
            </div>
          </div>
        )}

        {/* King Revealed / Mantri Guessing */}
        {(gameState.gameStatus === 'KING_REVEALED' || gameState.gameStatus === 'MANTRI_GUESSING') && (
          <div className="space-y-4">
            {/* Your Character */}
            <div className="pixel-card p-6">
              <h2 className="pixel-text mb-4" style={{ color: 'var(--pixel-dark)' }}>Your Character</h2>
              {currentPlayer?.character && (
                <div className={`pixel-card p-6 text-center ${characterCardClasses[currentPlayer.character]}`}>
                  <div className="flex justify-center mb-2">
                    {React.createElement(characterComponents[currentPlayer.character], { size: 96 })}
                  </div>
                  <p className="pixel-text-lg" style={{ color: 'var(--pixel-dark)' }}>{currentPlayer.character}</p>
                </div>
              )}
            </div>

            {/* All Players */}
            <div className="pixel-card p-6">
              <h2 className="pixel-text mb-4" style={{ color: 'var(--pixel-dark)' }}>Players</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gameState.players.map((player) => {
                  const showCharacter =
                    player.character === 'RAJA' ||
                    player.character === 'MANTRI' ||
                    player.id === playerId;

                  const CharacterComponent = player.character ? characterComponents[player.character] : null;

                  return (
                    <div
                      key={player.id}
                      onClick={() => {
                        if (isMantri && player.id !== playerId && player.character !== 'RAJA' && player.character !== 'MANTRI') {
                          setSelectedPlayer(player.id);
                        }
                      }}
                      className={`pixel-player-slot transition-all ${selectedPlayer === player.id
                        ? 'transform scale-105'
                        : ''
                        } ${isMantri && player.id !== playerId && player.character !== 'RAJA' && player.character !== 'MANTRI'
                          ? 'cursor-pointer hover:transform hover:scale-105'
                          : ''
                        } ${showCharacter && player.character ? characterCardClasses[player.character] : ''}`}
                      style={selectedPlayer === player.id ? { borderColor: 'var(--pixel-primary)', borderWidth: '6px' } : {}}
                    >
                      <p className="font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>{player.name}</p>
                      <div className="flex justify-center items-center gap-1 mb-2">
                        <PixelCoin size={16} />
                        <span className="text-sm font-bold" style={{ color: 'var(--pixel-dark)' }}>{player.score}</span>
                      </div>
                      {showCharacter && CharacterComponent && (
                        <div className="mt-2 flex flex-col items-center">
                          <CharacterComponent size={48} />
                          <p className="text-xs font-bold mt-1" style={{ color: 'var(--pixel-dark)' }}>{player.character}</p>
                        </div>
                      )}
                      {!showCharacter && (
                        <div className="mt-2 flex justify-center">
                          <PixelQuestionMark size={48} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {isMantri && (
                <div className="mt-6">
                  <p className="text-center mb-4 font-bold" style={{ color: 'var(--pixel-dark)' }}>
                    You are the Mantri! Select who you think is the Chor:
                  </p>
                  <button
                    onClick={handleMantriGuess}
                    disabled={loading || !selectedPlayer}
                    className="w-full pixel-btn pixel-btn-accent"
                    style={{ opacity: loading || !selectedPlayer ? 0.5 : 1 }}
                  >
                    {loading ? 'Submitting...' : 'Submit Guess'}
                  </button>
                </div>
              )}

              {!isMantri && (
                <div className="mt-6 text-center" style={{ color: 'var(--pixel-dark)' }}>
                  Waiting for Mantri to make a guess...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Round End */}
        {gameState.gameStatus === 'ROUND_END' && currentRoundResult && (
          <div className="pixel-card p-6 mb-4">
            <h2 className="pixel-text-lg mb-4 text-center" style={{ color: 'var(--pixel-dark)' }}>
              Round {currentRoundResult.round} Results
            </h2>

            <div className={`p-4 mb-6 text-center ${currentRoundResult.mantriGuessedCorrectly ? 'pixel-success' : 'pixel-error'}`}>
              <p className="font-bold">
                {currentRoundResult.mantriGuessedCorrectly
                  ? '✅ Mantri guessed correctly!'
                  : '❌ Mantri guessed wrong!'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {currentRoundResult.players.map((player) => {
                const CharacterComponent = characterComponents[player.character];
                return (
                  <div
                    key={player.id}
                    className={`pixel-card p-4 text-center ${characterCardClasses[player.character]}`}
                  >
                    <div className="flex justify-center mb-2">
                      <CharacterComponent size={48} />
                    </div>
                    <p className="font-bold text-sm" style={{ color: 'var(--pixel-dark)' }}>{player.name}</p>
                    <p className="text-xs font-medium" style={{ color: 'var(--pixel-dark)' }}>{player.character}</p>
                    <p className="pixel-score mt-2">+{player.pointsEarned}</p>
                  </div>
                );
              })}
            </div>

            <div className="p-4 mb-6" style={{ background: 'var(--pixel-bg)', border: '4px solid var(--pixel-dark)' }}>
              <h3 className="font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>Current Scores:</h3>
              <div className="space-y-2">
                {gameState.players
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div key={player.id} className="flex justify-between items-center">
                      <span className="font-bold" style={{ color: 'var(--pixel-dark)' }}>
                        {index + 1}. {player.name}
                      </span>
                      <span className="pixel-score">{player.score}</span>
                    </div>
                  ))}
              </div>
            </div>

            {isHost && (
              <button
                onClick={handleNextRound}
                disabled={loading}
                className="w-full pixel-btn"
                style={{ background: 'var(--pixel-success)', opacity: loading ? 0.5 : 1 }}
              >
                {loading ? 'Loading...' : gameState.currentRound >= gameState.maxRounds ? 'View Final Results' : 'Start Next Round'}
              </button>
            )}
            {!isHost && (
              <div className="text-center" style={{ color: 'var(--pixel-dark)' }}>
                Waiting for host to start next round...
              </div>
            )}
          </div>
        )}

        {/* Game End */}
        {gameState.gameStatus === 'GAME_END' && (
          <div className="pixel-card p-6">
            <h2 className="pixel-text-xl mb-6 text-center" style={{ color: 'var(--pixel-dark)' }}>🏆 Game Over!</h2>

            {/* Hidden card for image generation - uses explicit colors for html2canvas */}
            <div
              ref={resultsCardRef}
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                position: 'absolute',
                left: '0',
                top: '0',
                width: '600px',
                padding: '32px',
                visibility: 'hidden',
                pointerEvents: 'none',
                zIndex: -1,
                background: '#fef6e4',
                border: '4px solid #001858'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '48px' }}>👑</div>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginTop: '12px', color: '#001858' }}>RMCS Game</h1>
                <p style={{ fontSize: '18px', color: '#001858' }}>Final Results</p>
              </div>

              <div style={{
                padding: '24px',
                marginBottom: '24px',
                background: '#f582ae',
                border: '4px solid #001858',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '48px', marginBottom: '8px' }}>🥇</p>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#001858' }}>
                  {gameState.players.sort((a, b) => b.score - a.score)[0]?.name}
                </p>
                <p style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '8px', color: '#001858' }}>
                  {gameState.players.sort((a, b) => b.score - a.score)[0]?.score} pts
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                {gameState.players
                  .sort((a, b) => b.score - a.score)
                  .slice(1)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        marginBottom: '12px',
                        background: 'white',
                        border: '3px solid #001858'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>
                          {index === 0 ? '🥈' : index === 1 ? '🥉' : `${index + 2}.`}
                        </span>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#001858' }}>{player.name}</span>
                      </div>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#001858' }}>{player.score}</span>
                    </div>
                  ))}
              </div>

              <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '4px solid #001858' }}>
                <p style={{ color: '#001858' }}>Played {gameState.maxRounds} rounds</p>
                <p style={{ fontWeight: 'bold', marginTop: '8px', fontSize: '18px', color: '#001858' }}>Game Code: {gameToken}</p>
                <div style={{ marginTop: '16px', padding: '12px', background: '#8bd3dd', border: '3px solid #001858' }}>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#001858' }}>🎲 RMCS - Raja Mantri Chor Sipahi</p>
                  <p style={{ fontSize: '12px', color: '#001858', marginTop: '4px' }}>Play the classic Indian card game online!</p>
                </div>
              </div>
            </div>

            {/* Visible leaderboard */}
            <div className="space-y-4 mb-6">
              {gameState.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className={`pixel-card p-4 flex justify-between items-center ${index === 0 ? 'pixel-podium-gold' :
                      index === 1 ? 'pixel-podium-silver' :
                        index === 2 ? 'pixel-podium-bronze' : ''
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                      </span>
                      <span className="text-xl font-bold" style={{ color: 'var(--pixel-dark)' }}>{player.name}</span>
                    </div>
                    <span className="pixel-score text-xl">{player.score}</span>
                  </div>
                ))}
            </div>

            {/* Share Final Results */}
            <div className="mb-6 space-y-3">
              <button
                onClick={handleShareImage}
                disabled={loading}
                className="w-full pixel-btn"
                style={{ opacity: loading ? 0.5 : 1 }}
              >
                {loading ? 'Generating...' : '📸 Share as Image'}
              </button>

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
                    `🎲 RMCS - The classic Indian card game!\n` +
                    `Play Raja Mantri Chor Sipahi online with friends\n\n` +
                    `🎮 Play now: ${window.location.origin}`
                  );
                  window.open(`https://wa.me/?text=${message}`, '_blank');
                }}
                className="w-full pixel-btn"
                style={{ background: '#25D366', color: 'white' }}
              >
                📤 Share on WhatsApp
              </button>

              <button
                onClick={() => {
                  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
                  const winner = sortedPlayers[0];
                  const tweet = encodeURIComponent(
                    `🏆 Won RMCS with ${winner.score} pts!\n\n` +
                    `👑 Winner: ${winner.name}\n\n` +
                    `Play the classic Indian card game:\n` +
                    `${window.location.origin}\n\n` +
                    `#RMCS #RajaMantriChorSipahi #IndianGames`
                  );
                  window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
                }}
                className="w-full pixel-btn"
                style={{ background: '#000000', color: 'white' }}
              >
                𝕏 Share on X
              </button>
            </div>

            <button
              onClick={() => router.push('/')}
              className="w-full pixel-btn pixel-btn-secondary"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
