import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImposterSession } from '../types/imposter';

const SESSION_KEY = 'imposter_session_mobile';

export async function saveSession(session: ImposterSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getSession(): Promise<ImposterSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ImposterSession;
    if (!parsed.gameToken || !parsed.playerId || !parsed.playerName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
