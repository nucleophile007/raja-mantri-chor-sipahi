import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Modal } from 'react-native';
import { colors } from '../../theme/colors';

export default function ChitAnimationModal({ visible }: { visible: boolean }) {
  const rotation1 = useRef(new Animated.Value(0)).current;
  const rotation2 = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      // Loop the cards swishing back and forth
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(rotation1, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(rotation2, { toValue: -1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1.1, duration: 300, useNativeDriver: true })
          ]),
          Animated.parallel([
            Animated.timing(rotation1, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(rotation2, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(scale, { toValue: 0.8, duration: 300, useNativeDriver: true })
          ])
        ])
      ).start();
    } else {
      rotation1.setValue(0);
      rotation2.setValue(0);
      scale.setValue(0.8);
    }
  }, [visible]);

  const spin1 = rotation1.interpolate({ inputRange: [-1, 1], outputRange: ['-15deg', '15deg'] });
  const spin2 = rotation2.interpolate({ inputRange: [-1, 1], outputRange: ['15deg', '-15deg'] });

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>🎲 SHUFFLING CHITS</Text>
          <View style={styles.cardsContainer}>
            <Animated.View style={[styles.cardWrapper, { transform: [{ rotate: spin1 }, { scale }] }]}>
              <View style={styles.card}><Text style={styles.cardText}>?</Text></View>
            </Animated.View>
            <Animated.View style={[styles.cardWrapper, { transform: [{ rotate: spin2 }, { scale }] }]}>
               <View style={styles.card}><Text style={styles.cardText}>?</Text></View>
            </Animated.View>
          </View>
          <Text style={styles.subtitle}>Hold on, dispensing roles...</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: colors.surface,
    padding: 30,
    borderWidth: 6,
    borderColor: colors.border,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.border,
    marginBottom: 40,
    textAlign: 'center',
  },
  cardsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: -20,
  },
  cardWrapper: {
    zIndex: 1,
  },
  card: {
    width: 60,
    height: 90,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 40,
    fontWeight: '700',
  }
});
