import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';

interface ArcadeScreenProps {
  onSelectGame: (game: 'imposter' | 'rmcs') => void;
}

export default function ArcadeScreen({ onSelectGame }: ArcadeScreenProps) {
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🎮 Game Arcade</Text>
          <Text style={styles.subtitle}>Play classic party games with friends!</Text>
        </View>

        <View style={styles.gamesList}>
          {/* RMCS Card */}
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => onSelectGame('rmcs')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>👑</Text>
            <Text style={styles.cardTitle}>RMCS</Text>
            <Text style={styles.cardDesc}>Raja Mantri Chor Sipahi</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardFooterText}>👥 4 players</Text>
              <Text style={styles.cardFooterText}>⏱️ 5-15 min</Text>
            </View>
          </TouchableOpacity>

          {/* Imposter Card */}
          <TouchableOpacity 
            style={[styles.card, { marginTop: 20 }]} 
            onPress={() => onSelectGame('imposter')}
            activeOpacity={0.8}
          >
            <Text style={styles.cardIcon}>🕵️</Text>
            <Text style={styles.cardTitle}>Imposter</Text>
            <Text style={styles.cardDesc}>Find the Imposter among you</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardFooterText}>👥 3-20 players</Text>
              <Text style={styles.cardFooterText}>⏱️ 5-10 min</Text>
            </View>
          </TouchableOpacity>
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
    paddingTop: 40,
    gap: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    textAlign: 'center',
  },
  gamesList: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardDesc: {
    color: colors.text,
    fontSize: 14,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  cardFooterText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
