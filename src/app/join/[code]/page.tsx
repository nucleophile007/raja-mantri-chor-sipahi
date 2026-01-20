'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PixelMantri, PixelDice } from '@/components/PixelCharacters';

interface SessionInfo {
  valid: boolean;
  gameToken?: string;
  gameStatus?: string;
  playerName?: string;
  isHost?: boolean;
}

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [checking, setChecking] = useState(true);
  const [existingSession, setExistingSession] = useState<SessionInfo | null>(null);
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const storedPlayerId = localStorage.getItem('playerId');
      const storedGameToken = localStorage.getItem('gameToken');

      // No existing session - redirect to game page with code for RMCS to handle
      if (!storedPlayerId || !storedGameToken) {
        router.push(`/game/${code}?join=true`);
        return;
      }

      // Check if existing session is for the same game
      if (storedGameToken.toUpperCase() === code) {
        // Validate session is still active
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
            // Session is valid for this game - redirect directly to game
            router.push(`/game/${code}`);
            return;
          } else {
            // Session is invalid - clear and redirect to join form
            localStorage.removeItem('playerId');
            localStorage.removeItem('gameToken');
            router.push(`/?code=${code}`);
            return;
          }
        } catch (err) {
          // On error, try redirecting to game anyway
          router.push(`/game/${code}`);
          return;
        }
      } else {
        // User is in a DIFFERENT game - show conflict warning
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
            // They're in an active different game - show conflict
            setExistingSession(data);
            setConflict(true);
            setChecking(false);
          } else {
            // Their old session is invalid - clear and redirect
            localStorage.removeItem('playerId');
            localStorage.removeItem('gameToken');
            router.push(`/game/${code}?join=true`);
            return;
          }
        } catch (err) {
          // On error, just redirect to join
          router.push(`/?code=${code}`);
          return;
        }
      }
    };

    if (code) {
      checkSession();
    } else {
      router.push('/');
    }
  }, [code, router]);

  const handleLeaveAndJoin = async () => {
    setChecking(true);
    try {
      const storedPlayerId = localStorage.getItem('playerId');
      const storedGameToken = localStorage.getItem('gameToken');

      // Leave the current game
      await fetch('/api/game/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameToken: storedGameToken,
          playerId: storedPlayerId
        })
      });

      // Clear session
      localStorage.removeItem('playerId');
      localStorage.removeItem('gameToken');

      // Redirect to join the new game
      router.push(`/game/${code}?join=true`);
    } catch (err) {
      // Clear anyway and redirect
      localStorage.removeItem('playerId');
      localStorage.removeItem('gameToken');
      router.push(`/game/${code}?join=true`);
    }
  };

  const handleGoToCurrentGame = () => {
    if (existingSession?.gameToken) {
      router.push(`/game/${existingSession.gameToken}`);
    }
  };

  // Show conflict warning
  if (conflict && existingSession) {
    return (
      <div className="min-h-screen pixel-grid flex items-center justify-center p-4" style={{ background: 'var(--pixel-bg)' }}>
        <div className="pixel-card p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <PixelMantri size={64} />
            </div>
            <h2 className="pixel-text-lg mb-2" style={{ color: 'var(--pixel-dark)' }}>Active Game Found!</h2>
            <p style={{ color: 'var(--pixel-dark)' }}>
              You&apos;re already in a game as <strong>{existingSession.playerName}</strong>
            </p>
          </div>

          <div className="pixel-card p-4 mb-6" style={{ background: 'var(--pixel-accent)' }}>
            <p className="text-center font-bold" style={{ color: 'var(--pixel-dark)' }}>
              Current Game: {existingSession.gameToken}
            </p>
            <p className="text-center text-sm" style={{ color: 'var(--pixel-dark)' }}>
              Status: {existingSession.gameStatus}
            </p>
          </div>

          <p className="text-center mb-6 text-sm" style={{ color: 'var(--pixel-dark)' }}>
            To join game <strong>{code}</strong>, you must leave your current game first.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleGoToCurrentGame}
              className="w-full pixel-btn pixel-btn-secondary"
            >
              ← Return to Current Game
            </button>
            <button
              onClick={handleLeaveAndJoin}
              className="w-full pixel-btn"
              style={{ background: 'var(--pixel-danger)', color: 'white' }}
            >
              Leave & Join New Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen pixel-grid flex items-center justify-center" style={{ background: 'var(--pixel-bg)' }}>
      <div className="text-center">
        <div className="pixel-float mb-4">
          <PixelDice size={64} />
        </div>
        <div className="pixel-spinner mx-auto mb-4"></div>
        <p className="pixel-text" style={{ color: 'var(--pixel-dark)' }}>
          {checking ? 'Checking session...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}
