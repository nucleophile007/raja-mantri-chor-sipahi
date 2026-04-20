import { API_BASE_URL } from './config';
import { ImposterSession, StatePreviewResponse, ValidateSessionResponse } from '../types/imposter';

// Retry configuration
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 8000;

function headersFromSession(session?: Pick<ImposterSession, 'gameToken' | 'playerId'>): Record<string, string> {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.gameToken) {
    base['x-game-token'] = session.gameToken;
  }
  if (session?.playerId) {
    base['x-player-id'] = session.playerId;
  }

  return base;
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T;
  return data;
}

// Helper to add timeout to fetch
async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper for exponential backoff retry
async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  maxAttempts: number = DEFAULT_RETRY_ATTEMPTS,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[📡 API] ${options?.method || 'GET'} ${url} (attempt ${attempt}/${maxAttempts})`);
      const response = await fetchWithTimeout(url, options, timeoutMs);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);

      console.warn(
        `[⚠️ API Retry] Failed attempt ${attempt}/${maxAttempts}: ${lastError.message}`,
        `Retrying in ${backoffMs}ms...`,
      );

      if (attempt < maxAttempts) {
        await new Promise((resolve: (value: void) => void) => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw lastError || new Error('Max retry attempts reached');
}

export async function createImposterGame(playerName: string): Promise<ImposterSession> {
  try {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/imposter/create`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
      },
      DEFAULT_TIMEOUT_MS,
      3,
    );

    const data = await parseJson<{
      success?: boolean;
      error?: string;
      gameToken?: string;
      playerId?: string;
      playerName?: string;
    }>(response);

    if (!response.ok || !data.success || !data.gameToken || !data.playerId || !data.playerName) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    console.log('[✅ Game Created]', { playerId: data.playerId });
    return {
      gameToken: data.gameToken,
      playerId: data.playerId,
      playerName: data.playerName,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[❌ Create Game Failed]', message);
    throw new Error(`Failed to create game: ${message}`);
  }
}

export async function joinImposterGame(playerName: string, gameToken: string): Promise<ImposterSession> {
  try {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/imposter/join`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, gameToken }),
      },
      DEFAULT_TIMEOUT_MS,
      3,
    );

    const data = await parseJson<{
      success?: boolean;
      error?: string;
      gameToken?: string;
      playerId?: string;
      playerName?: string;
    }>(response);

    if (!response.ok || !data.success || !data.gameToken || !data.playerId || !data.playerName) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    console.log('[✅ Joined Game]', { playerId: data.playerId });
    return {
      gameToken: data.gameToken,
      playerId: data.playerId,
      playerName: data.playerName,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[❌ Join Game Failed]', message);
    throw new Error(`Failed to join game: ${message}`);
  }
}

export async function validateImposterSession(
  session: Pick<ImposterSession, 'gameToken' | 'playerId'>,
): Promise<ValidateSessionResponse> {
  try {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/imposter/validate-session`,
      {
        method: 'POST',
        headers: headersFromSession(session),
        body: JSON.stringify(session),
      },
      DEFAULT_TIMEOUT_MS,
      3,
    );

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await parseJson<ValidateSessionResponse>(response);
    console.log('[✅ Session Validated]', { playerId: session.playerId });
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[❌ Session Validation Failed]', message);
    throw new Error(`Session validation failed: ${message}`);
  }
}

export async function getImposterState(
  session: Pick<ImposterSession, 'gameToken' | 'playerId'>,
): Promise<StatePreviewResponse> {
  try {
    const query = new URLSearchParams({
      gameToken: session.gameToken,
      playerId: session.playerId,
    }).toString();

    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/imposter/state?${query}`,
      {
        method: 'GET',
        headers: headersFromSession(session),
      },
      DEFAULT_TIMEOUT_MS,
      2, // Fewer retries for polling calls
    );

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return parseJson<StatePreviewResponse>(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[❌ State Fetch Failed]', message);
    throw error; // Don't wrap, preserve original for polling handler
  }
}

export async function leaveImposterGame(
  session: Pick<ImposterSession, 'gameToken' | 'playerId'>,
): Promise<{ success?: boolean; error?: string }> {
  try {
    const response = await fetchWithRetry(
      `${API_BASE_URL}/api/imposter/leave`,
      {
        method: 'POST',
        headers: headersFromSession(session),
        body: JSON.stringify(session),
      },
      DEFAULT_TIMEOUT_MS,
      2,
    );

    const data = await parseJson<{ success?: boolean; error?: string }>(response);

    if (response.ok) {
      console.log('[✅ Left Game]', { playerId: session.playerId });
    }

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[❌ Leave Game Failed]', message);
    // Don't throw - graceful failure for leave
    return { success: false, error: message };
  }
}
