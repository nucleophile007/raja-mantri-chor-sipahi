// Particle type for visual effects
export interface Particle {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    type: 'sparkle' | 'dust' | 'glow';
}

// Chit data type
export interface ChitData {
    id: number;
    role: string;
    color: string;
    label: string;
    glowColor: string;
}

// Animation states
export type AnimationState =
    | 'idle'
    | 'entering'
    | 'settled'
    | 'opening'
    | 'releasing'
    | 'mixing'
    | 'falling'
    | 'entering2'
    | 'settled2'
    | 'grabbing'
    | 'exiting'
    | 'complete';

// Chit definitions
export const CHITS: ChitData[] = [
    { id: 1, role: 'R', color: '#fbbf24', label: 'Raja', glowColor: 'rgba(251, 191, 36, 0.6)' },
    { id: 2, role: 'M', color: '#60a5fa', label: 'Mantri', glowColor: 'rgba(96, 165, 250, 0.6)' },
    { id: 3, role: 'C', color: '#1f2937', label: 'Chor', glowColor: 'rgba(31, 41, 55, 0.6)' },
    { id: 4, role: 'S', color: '#34d399', label: 'Sipahi', glowColor: 'rgba(52, 211, 153, 0.6)' },
];

// Final positions for chits when they land
export const FINAL_POSITIONS = [
    { x: 20, y: 85, r: -15 },
    { x: 40, y: 82, r: 25 },
    { x: 60, y: 83, r: -10 },
    { x: 80, y: 84, r: 20 },
];

// Animation timeline configuration
export const ANIMATION_TIMELINE: { state: AnimationState; delay: number }[] = [
    { state: 'entering', delay: 100 },
    { state: 'settled', delay: 1200 },
    { state: 'opening', delay: 200 },
    { state: 'releasing', delay: 400 },
    { state: 'mixing', delay: 700 },
    { state: 'falling', delay: 1500 },
    { state: 'entering2', delay: 500 },
    { state: 'settled2', delay: 500 },
    { state: 'grabbing', delay: 300 },
    { state: 'exiting', delay: 1500 },
    { state: 'complete', delay: 1000 },
];
