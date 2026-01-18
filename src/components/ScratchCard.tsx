'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

interface ScratchCardProps {
    onComplete: () => void;
    cardContent: string | null;
    isScratched: boolean;
}

export default function ScratchCard({ onComplete, cardContent, isScratched }: ScratchCardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScratching, setIsScratching] = useState(false);
    const [scratchPercent, setScratchPercent] = useState(0);
    const [scratchedByUser, setScratchedByUser] = useState(false);

    // Revealed when: already scratched from server, OR user scratched AND content received
    const revealed = isScratched || (scratchedByUser && cardContent !== null);
    const showLoading = scratchedByUser && cardContent === null;

    const REVEAL_THRESHOLD = 40;

    // Initialize canvas with silver overlay (only if not already scratched)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || revealed || isScratched) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw silver scratch layer
        ctx.fillStyle = '#b0b0b0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add some texture
        ctx.fillStyle = '#a0a0a0';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            ctx.fillRect(x, y, 2, 2);
        }

        // Add "SCRATCH HERE" text
        ctx.fillStyle = '#808080';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2);
    }, [revealed, isScratched]);

    const scratch = useCallback((x: number, y: number) => {
        const canvas = canvasRef.current;
        if (!canvas || revealed || isScratched || scratchedByUser) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Calculate scratch percentage
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let transparent = 0;
        for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] === 0) transparent++;
        }
        const percent = (transparent / (imageData.data.length / 4)) * 100;
        setScratchPercent(percent);

        if (percent >= REVEAL_THRESHOLD && !scratchedByUser) {
            setScratchedByUser(true);
            onComplete();
        }
    }, [revealed, isScratched, scratchedByUser, onComplete]);

    const handleMouseDown = () => setIsScratching(true);
    const handleMouseUp = () => setIsScratching(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isScratching) return;
        const rect = e.currentTarget.getBoundingClientRect();
        scratch(e.clientX - rect.left, e.clientY - rect.top);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const touch = e.touches[0];
        scratch(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    const isImposter = cardContent === 'IMPOSTER';
    const showRevealed = revealed;

    return (
        <div className="relative w-full max-w-xs mx-auto">
            {/* Card background with content */}
            <div
                className={`relative w-full aspect-[3/4] rounded-lg overflow-hidden ${isImposter ? 'bg-red-900' : 'bg-gradient-to-br from-amber-100 to-amber-200'
                    }`}
                style={{
                    border: '4px solid var(--pixel-dark)',
                    boxShadow: '4px 4px 0px rgba(0,0,0,0.3)'
                }}
            >
                {/* Card content (visible when scratched) */}
                <div className={`absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-500 ${showRevealed ? 'opacity-100' : 'opacity-0'
                    }`}>
                    <div className="text-center">
                        {showLoading ? (
                            <>
                                <div className="text-4xl mb-4 animate-pulse">⏳</div>
                                <p className="text-sm" style={{ color: 'var(--pixel-dark)' }}>
                                    Revealing your card...
                                </p>
                            </>
                        ) : isImposter ? (
                            <>
                                <div className="text-6xl mb-4">🕵️</div>
                                <div className="text-3xl font-bold text-red-500"
                                    style={{ textShadow: '2px 2px 0 #000' }}>
                                    IMPOSTER
                                </div>
                                <p className="text-white text-sm mt-2">Blend in and survive!</p>
                            </>
                        ) : cardContent ? (
                            <>
                                <div className="text-6xl mb-4">📜</div>
                                <div className="text-2xl font-bold"
                                    style={{ color: 'var(--pixel-dark)' }}>
                                    {cardContent}
                                </div>
                                <p className="text-sm mt-2" style={{ color: 'var(--pixel-dark)' }}>
                                    This is your word!
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="text-4xl mb-4">⏳</div>
                                <p className="text-sm" style={{ color: 'var(--pixel-dark)' }}>
                                    Loading your card...
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {/* Scratch layer - only show if NOT revealed OR loading */}
                {!showRevealed && (
                    <canvas
                        ref={canvasRef}
                        width={240}
                        height={320}
                        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        onTouchStart={() => setIsScratching(true)}
                        onTouchEnd={() => setIsScratching(false)}
                        onTouchMove={handleTouchMove}
                    />
                )}
            </div>

            {/* Scratch progress - only show if not revealed */}
            {!showRevealed && (
                <div className="mt-2 text-center text-sm" style={{ color: 'var(--pixel-dark)' }}>
                    <div className="w-full bg-gray-200 rounded h-2 mb-1">
                        <div
                            className="h-2 rounded transition-all"
                            style={{
                                width: `${scratchPercent}%`,
                                background: 'var(--pixel-primary)'
                            }}
                        />
                    </div>
                    Scratch to reveal!
                </div>
            )}
        </div>
    );
}
