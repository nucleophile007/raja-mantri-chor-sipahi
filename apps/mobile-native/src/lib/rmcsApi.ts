import { API_BASE_URL } from './config';
import { RmcsSession, RmcsValidateSessionResponse, RmcsGameState } from '../types/rmcs';

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 8000;

function headersFromSession(session?: Pick<RmcsSession, 'gameToken' | 'playerId'>): Record<string, string> {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.gameToken) base['x-game-token'] = session.gameToken;
  if (session?.playerId) base['x-player-id'] = session.playerId;
  return base;
}

async function fetchWithRetry(url: string, options?: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS, maxAttempts = DEFAULT_RETRY_ATTEMPTS) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return res;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxAttempts) await new Promise<void>(resolve => setTimeout(() => resolve(), 1000 * attempt));
    }
  }
  throw lastError || new Error('Max retry attempts reached');
}

export async function createRmcsGame(playerName: string, maxRounds: number = 5): Promise<RmcsSession> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/game/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName, maxRounds }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || 'Failed to create game');
  return { gameToken: data.gameToken, playerId: data.playerId, playerName: data.playerName || playerName };
}

export async function joinRmcsGame(playerName: string, gameToken: string): Promise<RmcsSession> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/game/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName, gameToken }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || 'Failed to join game');
  return { gameToken, playerId: data.playerId, playerName };
}

export async function validateRmcsSession(session: Pick<RmcsSession, 'gameToken' | 'playerId'>): Promise<RmcsValidateSessionResponse> {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/game/validate-session`, {
    method: 'POST',
    headers: headersFromSession(session),
    body: JSON.stringify(session),
  });
  return await response.json();
}

export async function leaveRmcsGame(session: Pick<RmcsSession, 'gameToken' | 'playerId'>) {
  const response = await fetchWithRetry(`${API_BASE_URL}/api/game/leave`, {
    method: 'POST',
    headers: headersFromSession(session),
    body: JSON.stringify(session),
  }, DEFAULT_TIMEOUT_MS, 2);
  return await response.json();
}

export async function getRmcsState(session: Pick<RmcsSession, 'gameToken' | 'playerId'>): Promise<{success: boolean; gameState: RmcsGameState}> {
  const query = new URLSearchParams({ gameToken: session.gameToken }).toString();
  const response = await fetchWithRetry(`${API_BASE_URL}/api/game/state?${query}`, {
    method: 'GET',
    headers: headersFromSession(session),
  }, DEFAULT_TIMEOUT_MS, 2);
  return await response.json();
}

export async function distributeChits(session: Pick<RmcsSession, 'gameToken' | 'playerId'>) {
    const response = await fetchWithRetry(`${API_BASE_URL}/api/game/distribute`, {
        method: 'POST',
        headers: headersFromSession(session),
        body: JSON.stringify(session),
    });
    return await response.json();
}

export async function revealKing(session: Pick<RmcsSession, 'gameToken' | 'playerId'>) {
    const response = await fetchWithRetry(`${API_BASE_URL}/api/game/reveal-king`, {
        method: 'POST',
        headers: headersFromSession(session),
        body: JSON.stringify(session),
    });
    return await response.json();
}

export async function submitGuess(session: Pick<RmcsSession, 'gameToken' | 'playerId'>, guessedPlayerId: string) {
    const response = await fetchWithRetry(`${API_BASE_URL}/api/game/guess`, {
        method: 'POST',
        headers: headersFromSession(session),
        body: JSON.stringify({...session, guessedPlayerId}),
    });
    return await response.json();
}

export async function nextRound(session: Pick<RmcsSession, 'gameToken' | 'playerId'>) {
    const response = await fetchWithRetry(`${API_BASE_URL}/api/game/next-round`, {
        method: 'POST',
        headers: headersFromSession(session),
        body: JSON.stringify(session),
    });
    return await response.json();
}
