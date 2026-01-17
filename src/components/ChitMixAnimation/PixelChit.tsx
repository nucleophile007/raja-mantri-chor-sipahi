// Pixel art chit/paper component

interface PixelChitProps {
    role: string;
    color: string;
}

export default function PixelChit({ role, color }: PixelChitProps) {
    return (
        <svg
            width="90"
            height="60"
            viewBox="0 0 36 24"
            style={{ imageRendering: 'auto' }}
            className="drop-shadow-lg"
        >
            <defs>
                <linearGradient id={`paperGrad-${role}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#f8f8f8" />
                    <stop offset="100%" stopColor="#f0f0f0" />
                </linearGradient>

                <linearGradient id={`shadowGrad-${role}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d0d0d0" />
                    <stop offset="50%" stopColor="#e0e0e0" />
                    <stop offset="100%" stopColor="#d0d0d0" />
                </linearGradient>

                {/* Shine effect */}
                <linearGradient id={`shineGrad-${role}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                    <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
            </defs>

            {/* Main folded paper body */}
            <rect
                x="2"
                y="2"
                width="32"
                height="20"
                rx="1"
                fill={`url(#paperGrad-${role})`}
                stroke="#d4d4d4"
                strokeWidth="0.5"
            />

            {/* Top fold - triangular flap */}
            <path
                d="M 2 2 L 18 2 L 2 10 Z"
                fill="#e8e8e8"
                stroke="#c8c8c8"
                strokeWidth="0.3"
            />

            {/* Fold shadow */}
            <path
                d="M 2 2 L 18 2 L 2 10 Z"
                fill="#000000"
                opacity="0.08"
            />

            {/* Shine overlay */}
            <rect
                x="2"
                y="2"
                width="12"
                height="8"
                rx="1"
                fill={`url(#shineGrad-${role})`}
                opacity="0.5"
            />

            {/* Center vertical fold line */}
            <line
                x1="18"
                y1="2"
                x2="18"
                y2="22"
                stroke="#d8d8d8"
                strokeWidth="1"
                strokeDasharray="0.5,0.5"
            />

            {/* Horizontal crease lines */}
            <line x1="6" y1="8" x2="30" y2="8" stroke="#e8e8e8" strokeWidth="0.4" opacity="0.6" />
            <line x1="6" y1="12" x2="30" y2="12" stroke="#e8e8e8" strokeWidth="0.5" opacity="0.7" />
            <line x1="6" y1="16" x2="30" y2="16" stroke="#e8e8e8" strokeWidth="0.4" opacity="0.6" />

            {/* Side shadows */}
            <rect x="2" y="2" width="1.5" height="20" fill="#000000" opacity="0.05" />
            <rect x="32.5" y="2" width="1.5" height="20" fill="#000000" opacity="0.05" />

            {/* Bottom shadow */}
            <ellipse cx="18" cy="23" rx="14" ry="1.5" fill="#000000" opacity="0.15" />

            {/* Paper edges highlight */}
            <line x1="2" y1="2" x2="34" y2="2" stroke="#ffffff" strokeWidth="0.5" opacity="0.7" />
            <line x1="2" y1="2" x2="2" y2="22" stroke="#ffffff" strokeWidth="0.5" opacity="0.5" />

            {/* Corner fold detail */}
            <path d="M 32 2 L 34 2 L 34 4 Z" fill="#e0e0e0" opacity="0.8" />
        </svg>
    );
}
