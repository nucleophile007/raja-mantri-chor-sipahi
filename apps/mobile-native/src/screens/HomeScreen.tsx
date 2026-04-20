import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors } from '../theme/colors';
import {
  createImposterGame,
  joinImposterGame,
  validateImposterSession,
} from '../lib/imposterApi';
import { clearSession, getSession, saveSession } from '../lib/session';
import { useGame } from '../context/GameContext';

export default function HomeScreen() {
  const { updateGameState, setLoading } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [gameToken, setGameToken] = useState('');
  const [loading, setLoadingLocal] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [restoreError, setRestoreError] = useState('');

  const canSubmit = useMemo(() => playerName.trim().length > 0, [playerName]);

  // Check for existing session on mount with retry logic
  const restoreSession = useCallback(async (attempt: number = 1) => {
    const maxAttempts = 3;
    try {
      console.log(`[🔄 Session Restore] Attempt ${attempt}/${maxAttempts}`);
      const stored = await getSession();
      if (!stored) {
        console.log('[ℹ️ No stored session]');
        setCheckingSession(false);
        return;
      }

      console.log('[⏳ Validating session...]', { playerId: stored.playerId });
      const validated = await validateImposterSession(stored);
      if (validated.valid && validated.hasSession) {
        console.log('[✅ Session Valid]', { status: validated.gameStatus || 'WAITING' });
        updateGameState({
          gameToken: stored.gameToken,
          playerId: stored.playerId,
          playerName: stored.playerName,
          gameStatus: (validated.gameStatus as any) || 'WAITING',
        });
      } else {
        console.log('[⚠️ Session Invalid - Clearing]');
        await clearSession();
        setRestoreError('');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[❌ Session Restore Failed]', message, { attempt });

      if (attempt < maxAttempts) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
        console.log(`[⏰ Retrying in ${backoffMs}ms...]`);
        setRestoreError(`Retrying connection (${attempt}/${maxAttempts})...`);
        await new Promise((resolve: (value: void) => void) => setTimeout(resolve, backoffMs));
        await restoreSession(attempt + 1);
      } else {
        console.log('[🛑 Max restore attempts reached]');
        setRestoreError('Could not restore session. Please try creating or joining a new game.');
        await clearSession();
      }
    } finally {
      if (attempt === 1) {
        setCheckingSession(false);
      }
    }
  }, [updateGameState]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const handleHost = useCallback(async () => {
    if (!canSubmit || loading) return;

    setLoadingLocal(true);
    setError('');
    try {
      const created = await createImposterGame(playerName.trim());
      await saveSession(created);
      updateGameState({
        gameToken: created.gameToken,
        playerId: created.playerId,
        playerName: created.playerName,
        gameStatus: 'WAITING',
        players: [
          {
            name: created.playerName,
            hasScratched: false,
            hasVoted: false,
            isHost: true,
          },
        ],
      });
    } catch (err: any) {
      setError(err?.message || 'Could not create game');
      Alert.alert('Error', err?.message || 'Failed to create game');
    } finally {
      setLoadingLocal(false);
    }
  }, [canSubmit, updateGameState, loading, playerName]);

  const handleJoin = useCallback(async () => {
    if (!canSubmit || !gameToken.trim() || loading) return;

    setLoadingLocal(true);
    setError('');
    try {
      const joined = await joinImposterGame(
        playerName.trim(),
        gameToken.trim().toUpperCase()
      );
      await saveSession(joined);
      updateGameState({
        gameToken: joined.gameToken,
        playerId: joined.playerId,
        playerName: joined.playerName,
        gameStatus: 'WAITING',
      });
    } catch (err: any) {
      setError(err?.message || 'Could not join game');
      Alert.alert('Error', err?.message || 'Failed to join game');
    } finally {
      setLoadingLocal(false);
    }
  }, [canSubmit, gameToken, loading, playerName, updateGameState]);

  if (checkingSession) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.text} />
          <Text style={styles.loadingText}>
            {restoreError || 'Restoring session...'}
          </Text>
          {restoreError && (
            <TouchableOpacity
              onPress={() => {
                setRestoreError('');
                restoreSession();
              }}
              style={[styles.button, styles.hostButton, { marginTop: 16 }]}
            >
              <Text style={styles.buttonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.kicker}>DESI ARCADE</Text>
        <Text style={styles.title}>Imposter</Text>
        <Text style={styles.subtitle}>
          React Native CLI build wired to your backend
        </Text>

        {restoreError && !checkingSession && (
          <View style={styles.restoreErrorCard}>
            <Text style={styles.errorText}>⚠️ Connection Issue</Text>
            <Text style={styles.errorDescription}>{restoreError}</Text>
            <TouchableOpacity
              onPress={() => {
                setRestoreError('');
                setCheckingSession(true);
                restoreSession();
              }}
              style={[styles.button, styles.hostButton, { marginTop: 12 }]}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && <Text style={styles.errorText}>❌ {error}</Text>}

        <View style={styles.card}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Enter your name"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            maxLength={20}
            editable={!loading}
            style={styles.input}
          />

          <Text style={styles.label}>Game Code (to join)</Text>
          <TextInput
            value={gameToken}
            onChangeText={setGameToken}
            placeholder="e.g. AB12CD"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            maxLength={8}
            editable={!loading}
            style={styles.input}
          />

          <View style={styles.actionsRow}>
            <TouchableOpacity
              disabled={loading || !canSubmit}
              onPress={handleHost}
              style={[
                styles.button,
                styles.hostButton,
                (loading || !canSubmit) && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Host Game</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              disabled={loading || !canSubmit || !gameToken.trim()}
              onPress={handleJoin}
              style={[
                styles.button,
                styles.joinButton,
                (loading || !canSubmit || !gameToken.trim()) && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Join Game</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            🌐 API Base: localhost:3000 (configured)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: 20,
    paddingTop: 28,
    gap: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  kicker: {
    color: colors.text,
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 8,
  },
  errorText: {
    color: colors.danger,
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostButton: {
    backgroundColor: colors.primary,
  },
  joinButton: {
    backgroundColor: colors.secondary,
  },
  buttonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  helperText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
  },
  restoreErrorCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorDescription: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
