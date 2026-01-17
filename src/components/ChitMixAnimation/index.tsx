'use client';

import { useEffect, useState, useRef } from 'react';
import { AnimationState, CHITS, FINAL_POSITIONS, ANIMATION_TIMELINE } from './types';
import { getChitPosition } from './animationUtils';
import PixelHand from './PixelHand';
import PixelChit from './PixelChit';

interface ChitMixAnimationProps {
    onComplete?: () => void;
    autoPlay?: boolean;
}

export default function ChitMixAnimation({ onComplete, autoPlay = true }: ChitMixAnimationProps) {
    const [animationState, setAnimationState] = useState<AnimationState>('idle');
    const [animationTime, setAnimationTime] = useState(0);
    const [grabbedChits, setGrabbedChits] = useState<boolean[]>([false, false, false, false]);
    const [grabHandsOpen, setGrabHandsOpen] = useState(true);
    const animationFrameRef = useRef<number | null>(null);

    // Animation timeline effect
    useEffect(() => {
        if (!autoPlay) return;

        const timers: NodeJS.Timeout[] = [];
        let currentDelay = 0;

        ANIMATION_TIMELINE.forEach(({ state, delay }) => {
            currentDelay += delay;
            const timer = setTimeout(() => {
                setAnimationState(state);

                if (state === 'entering2') {
                    setGrabHandsOpen(true);
                }

                if (state === 'grabbing') {
                    setGrabHandsOpen(true);
                }

                if (state === 'exiting') {
                    setGrabHandsOpen(false);
                }

                if (state === 'complete' && onComplete) {
                    setTimeout(onComplete, 500);
                    setGrabHandsOpen(false);
                }
            }, currentDelay);
            timers.push(timer);
        });

        return () => {
            timers.forEach(timer => clearTimeout(timer));
        };
    }, [autoPlay, onComplete]);

    // Continuous animation loop for mixing movement
    useEffect(() => {
        if (animationState === 'idle' || animationState === 'complete') return;

        const animate = () => {
            setAnimationTime(Date.now());
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [animationState]);

    const isHandOpen = animationState === 'releasing' || animationState === 'mixing' || animationState === 'falling';
    const areChitsVisible = animationState === 'releasing' || animationState === 'mixing' || animationState === 'falling' || animationState === 'entering2' || animationState === 'settled2' || animationState === 'grabbing';

    return (
        <div
            className="relative w-full h-[500px] overflow-hidden"
            style={{
                background: 'var(--pixel-bg, #fef6e4)',
                border: '4px solid var(--pixel-dark, #001858)',
                boxShadow: '4px 4px 0px rgba(0, 24, 88, 0.3)',
                imageRendering: 'pixelated',
            }}
        >
            {/* Pixel grid background pattern */}
            <div
                className="absolute inset-0 pointer-events-none opacity-30"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(0, 24, 88, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 24, 88, 0.05) 1px, transparent 1px)
          `,
                    backgroundSize: '16px 16px',
                }}
            />

            {/* Decorative pixel corners */}
            <div className="absolute top-2 left-2 w-4 h-4" style={{ background: 'var(--pixel-primary, #8bd3dd)', border: '2px solid var(--pixel-dark, #001858)' }} />
            <div className="absolute top-2 right-2 w-4 h-4" style={{ background: 'var(--pixel-primary, #8bd3dd)', border: '2px solid var(--pixel-dark, #001858)' }} />
            <div className="absolute bottom-2 left-2 w-4 h-4" style={{ background: 'var(--pixel-primary, #8bd3dd)', border: '2px solid var(--pixel-dark, #001858)' }} />
            <div className="absolute bottom-2 right-2 w-4 h-4" style={{ background: 'var(--pixel-primary, #8bd3dd)', border: '2px solid var(--pixel-dark, #001858)' }} />

            {/* First Hand - Coming from left */}
            <div
                className="absolute transition-all ease-in-out"
                style={{
                    left: animationState === 'idle'
                        ? '-250px'
                        : (animationState === 'entering' || animationState === 'settled' || animationState === 'opening' || animationState === 'releasing')
                            ? '20%'
                            : '-250px',
                    top: '50%',
                    transform: `translateY(-50%) ${animationState === 'settled' ? 'scale(1.02)' : 'scale(1)'}`,
                    opacity: (animationState === 'idle' || animationState === 'mixing' || animationState === 'falling' || animationState.startsWith('grabbing') || animationState === 'complete') ? 0 : 1,
                    transitionDuration: '1200ms',
                }}
            >
                <PixelHand isOpen={isHandOpen} />
            </div>

            {/* Four Grabbing Hands */}
            {(animationState === 'entering2' || animationState === 'settled2' || animationState === 'grabbing' || animationState === 'exiting') && CHITS.map((chit, index) => {
                const pos = FINAL_POSITIONS[index];

                const handY = animationState === 'entering2'
                    ? '120%'
                    : (animationState === 'settled2' || animationState === 'grabbing')
                        ? `${pos.y}%`
                        : '120%';

                const isThisHandOpen = grabHandsOpen;
                const staggerDelay = index * 100;

                return (
                    <div
                        key={`grab-hand-${index}`}
                        className="absolute transition-all"
                        style={{
                            left: `${pos.x}%`,
                            top: handY,
                            transform: `translate(-50%, -50%) rotate(270deg) ${animationState === 'grabbing' ? 'scale(1.05)' : 'scale(1)'}`,
                            opacity: animationState === 'exiting' ? 0 : 1,
                            zIndex: 5 + index,
                            transitionDuration: '4000ms',
                            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                            transitionDelay: `${staggerDelay}ms`,
                        }}
                    >
                        <div style={{ transform: 'scale(1)' }}>
                            <PixelHand isOpen={isThisHandOpen} />
                        </div>
                    </div>
                );
            })}

            {/* Chits */}
            {CHITS.map((chit, index) => {
                const baseDelay = index * 20;
                let opacity = 0;

                if (areChitsVisible && !grabbedChits[index]) {
                    opacity = 1;
                }

                if (grabbedChits[index] || animationState === 'exiting' || animationState === 'complete') {
                    opacity = 0;
                }

                const { x, y, rotation, scale } = areChitsVisible && !grabbedChits[index]
                    ? getChitPosition(index, animationState, animationTime, FINAL_POSITIONS)
                    : { x: 20, y: 50, rotation: 0, scale: 0.5 };

                return (
                    <div
                        key={chit.id}
                        className="absolute"
                        style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
                            opacity,
                            transition: (grabbedChits[index] || animationState === 'exiting' || animationState === 'complete')
                                ? 'none'
                                : animationState === 'mixing'
                                    ? 'none'
                                    : animationState === 'releasing'
                                        ? `all 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${baseDelay}ms`
                                        : `all 700ms ease-in-out`,
                            zIndex: 10,
                        }}
                    >
                        <PixelChit role={chit.role} color={chit.color} />
                    </div>
                );
            })}

            {/* Simple pixel ground line */}
            <div className="absolute bottom-8 left-8 right-8 h-1" style={{ background: 'var(--pixel-dark, #001858)', opacity: 0.3 }} />
            <div className="absolute bottom-7 left-8 right-8 h-1" style={{ background: 'var(--pixel-dark, #001858)', opacity: 0.15 }} />

            {/* Status text - simple pixel style */}
            <div
                className="absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 text-xs font-bold text-center"
                style={{
                    background: 'var(--pixel-accent, #f582ae)',
                    color: 'var(--pixel-dark, #001858)',
                    border: '3px solid var(--pixel-dark, #001858)',
                    boxShadow: '2px 2px 0px rgba(0, 24, 88, 0.3)',
                }}
            >
                {animationState === 'idle' && '✨ Ready...'}
                {animationState === 'entering' && '🤚 Hand entering...'}
                {animationState === 'settled' && '✋ Hand in position...'}
                {animationState === 'opening' && '👋 Opening fist...'}
                {animationState === 'releasing' && '🎴 Releasing chits...'}
                {animationState === 'mixing' && '🌀 Mixing...'}
                {animationState === 'falling' && '🎯 Drawing...'}
                {animationState === 'entering2' && '🙌 Hands reaching...'}
                {animationState === 'settled2' && '👐 Ready to grab...'}
                {animationState === 'grabbing' && '✊ Grabbing...'}
                {animationState === 'exiting' && '🎉 Got it!'}
                {animationState === 'complete' && '✨ Complete!'}
            </div>
        </div>
    );
}
