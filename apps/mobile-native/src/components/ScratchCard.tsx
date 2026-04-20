import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Vibration,
} from 'react-native';
import Svg, { Rect, Path, Mask } from 'react-native-svg';
import { colors } from '../theme/colors';

interface ScratchCardProps {
  onComplete: () => void;
  cardContent: string | null;
  isScratched: boolean;
}

export default function ScratchCard({
  onComplete,
  cardContent,
  isScratched,
}: ScratchCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [scratchedByUser, setScratchedByUser] = useState(false);
  const [scratchPath, setScratchPath] = useState('');

  const REVEAL_THRESHOLD = 50;
  const revealed = isScratched || (scratchedByUser && cardContent !== null);

  const stateRef = useRef({ percent: 0, done: false });
  const startPos = useRef({ x: 0, y: 0 });
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        if (stateRef.current.done || isScratched) return;
        // Start of standard swipe - get local coordinates!
        startPos.current = {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        };
        setScratchPath(
          (p) => `${p} M ${startPos.current.x} ${startPos.current.y}`
        );
      },
      onPanResponderMove: (evt, gestureState) => {
        if (stateRef.current.done || isScratched) return;
        
        // Calculate current position relative to start + distance!
        const currentX = startPos.current.x + gestureState.dx;
        const currentY = startPos.current.y + gestureState.dy;

        setScratchPath((p) => `${p} L ${currentX} ${currentY}`);
        
        // Slowly increase completion
        stateRef.current.percent = Math.min(stateRef.current.percent + 0.5, 100);
        setScratchPercent(Math.floor(stateRef.current.percent));

        if (stateRef.current.percent >= REVEAL_THRESHOLD && !stateRef.current.done) {
          stateRef.current.done = true;
          setIsRevealed(true);
          setScratchedByUser(true);
          Vibration.vibrate([0, 30, 20, 30]);
          if (onCompleteRef.current) {
            onCompleteRef.current();
          }
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const isImposter = cardContent === 'IMPOSTER';

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer} {...panResponder.panHandlers}>
        {/* The Base Level Details Beneath the Scratch Area */}
        <View
          style={[
            styles.card,
            isImposter && !revealed
              ? { backgroundColor: '#8B0000' } // fake dark before scratching ends
              : !revealed
              ? { backgroundColor: '#FFF8DC' } // standard cream baseline!
              : isImposter
              ? { backgroundColor: '#DC143C' }
              : { backgroundColor: '#F5DEB3' },
          ]}
        >
          {revealed ? (
            <View style={styles.revealedContent}>
              {isImposter ? (
                <>
                  <Text style={styles.icon}>🕵️</Text>
                  <Text style={styles.imposterText}>IMPOSTER</Text>
                  <Text style={styles.subtitle}>Blend in and survive!</Text>
                </>
              ) : (
                <>
                  <Text style={styles.icon}>📜</Text>
                  <Text style={styles.wordText}>{cardContent}</Text>
                  <Text style={styles.subtitle}>This is your word!</Text>
                </>
              )}
            </View>
          ) : (
            <>
              {/* Fake hidden stuff before the network tells us our real fate */}
              <View style={styles.revealedContent}>
                 <Text style={styles.icon}>❓</Text>
                 <Text style={[styles.wordText, { color: '#bbb' }]}>?????</Text>
              </View>
            </>
          )}

          {scratchedByUser && !cardContent && (
            <View style={[styles.loadingContent, StyleSheet.absoluteFill]}>
              <View style={styles.loadingOverlayBackground}>
                <Text style={styles.icon}>⏳</Text>
                <Text style={[styles.loadingText, { color: '#000' }]}>Revealing...</Text>
              </View>
            </View>
          )}
        </View>

        {/* The Actual Visual SVG Scratch Mask Layer Overlay! */}
        {!revealed && (
          <View style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%">
              <Mask id="scratchMask">
                {/* White Means Fully Visible */}
                <Rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black means Eraser / Transparent Hole! */}
                <Path
                  d={scratchPath}
                  stroke="black"
                  strokeWidth={40}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </Mask>
              <Rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="#b0b0b0"
                mask="url(#scratchMask)"
              />
            </Svg>

            {/* Static TEXT Over the Silver Scratch Mask */}
             {scratchPercent < 10 && (
                <View style={styles.scratchOverlay} pointerEvents="none">
                  <Text style={styles.scratchText}>SCRATCH HERE</Text>
                </View>
             )}
          </View>
        )}
      </View>

      {/* Progress indicator */}
      {!revealed && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${scratchPercent}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>Scratch to reveal! ({scratchPercent}%)</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  cardContainer: {
    width: 180,
    height: 240,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 5,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scratchOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scratchText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#808080',
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: -1 },
    textShadowRadius: 1,
    zIndex: 10,
    fontFamily: 'monospace',
    opacity: 0.7,
  },
  revealedContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  imposterText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  wordText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 12,
    color: colors.text,
  },
  loadingContent: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  loadingOverlayBackground: {
     backgroundColor: 'rgba(255,255,255,0.8)',
     padding: 20,
     borderRadius: 10,
     alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: colors.text,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8bd3dd',
  },
  progressText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});
