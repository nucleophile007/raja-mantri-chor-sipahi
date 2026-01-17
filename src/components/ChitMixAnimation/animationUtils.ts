import { Particle } from './types';

// Generate particles
export const spawnParticles = (
    x: number,
    y: number,
    count: number,
    type: 'sparkle' | 'dust' | 'glow',
    colors: string[],
    particleIdRef: React.MutableRefObject<number>
): Particle[] => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
        newParticles.push({
            id: particleIdRef.current++,
            x,
            y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8 - 2,
            life: 1,
            maxLife: 0.5 + Math.random() * 0.5,
            size: type === 'sparkle' ? 2 + Math.random() * 4 : type === 'glow' ? 8 + Math.random() * 12 : 3 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            type,
        });
    }
    return newParticles;
};

// Trigger screen shake effect
export const triggerShake = (
    intensity: number = 5,
    setScreenShake: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>
) => {
    let frame = 0;
    const maxFrames = 10;
    const shake = () => {
        if (frame < maxFrames) {
            const decay = 1 - frame / maxFrames;
            setScreenShake({
                x: (Math.random() - 0.5) * intensity * decay,
                y: (Math.random() - 0.5) * intensity * decay,
            });
            frame++;
            requestAnimationFrame(shake);
        } else {
            setScreenShake({ x: 0, y: 0 });
        }
    };
    shake();
};

// Update particles with physics
export const updateParticles = (particles: Particle[]): Particle[] => {
    return particles
        .map(p => ({
            ...p,
            x: p.x + p.vx * 0.1,
            y: p.y + p.vy * 0.1,
            vy: p.vy + 0.3, // gravity
            life: p.life - 0.02,
        }))
        .filter(p => p.life > 0);
};

// Get chit position based on animation state
export const getChitPosition = (
    index: number,
    animationState: string,
    animationTime: number,
    finalPositions: { x: number; y: number; r: number }[]
): { x: number; y: number; rotation: number; scale: number; glow: boolean } => {
    let x = 20;
    let y = 50;
    let rotation = 0;
    let scale = 0.5;
    let glow = false;

    if (animationState === 'releasing') {
        x = 20 + index * 3;
        y = 30 - index * 2;
        rotation = index * 20 - 30;
        scale = 0.8 + index * 0.05;
        glow = true;
    } else if (animationState === 'mixing') {
        const time = animationTime;
        const t = time / 1000;

        // Gentler, less chaotic movement
        const wave1 = Math.sin(t * 2 + index * 1.2) * 18;
        const wave2 = Math.cos(t * 1.8 + index * 1.5) * 16;

        x = 50 + wave1 + Math.cos(t * 2.5 + index) * 10;
        y = 50 + wave2 + Math.sin(t * 2 + index * 0.8) * 10;

        rotation = (t * 400 + index * 90) + Math.sin(t * 2.5 + index) * 15;

        // Subtle wobble
        const wobbleX = Math.sin(time / 100 + index * 2) * 3;
        const wobbleY = Math.cos(time / 120 + index * 1.5) * 3;

        x = x + wobbleX;
        y = y + wobbleY;
        scale = 1 + Math.sin(time / 150 + index) * 0.08;
        glow = true;
    } else {
        const pos = finalPositions[index];
        x = pos.x;
        y = pos.y;
        rotation = pos.r;
        scale = 1;

        if (animationState === 'settled2' || animationState === 'grabbing') {
            y = pos.y + Math.sin(animationTime / 300 + index) * 0.5;
            rotation = pos.r + Math.sin(animationTime / 400 + index * 2) * 2;
        }
    }

    return { x, y, rotation, scale, glow };
};
