// Palm/Top view of pixel art hand component

interface PixelHandProps {
    isOpen: boolean;
}

export default function PixelHand({ isOpen }: PixelHandProps) {
    return (
        <svg
            width="220"
            height="220"
            viewBox="0 0 100 100"
            style={{ imageRendering: 'pixelated' }}
            className="drop-shadow-2xl"
        >
            {/* Gradient definitions for more realistic skin */}
            <defs>
                <radialGradient id="palmGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f0c8a0" />
                    <stop offset="70%" stopColor="#e6b885" />
                    <stop offset="100%" stopColor="#d4a574" />
                </radialGradient>
                <radialGradient id="fingerGradient" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="#f5d4b8" />
                    <stop offset="100%" stopColor="#e6b885" />
                </radialGradient>
            </defs>

            {/* Wrist/Forearm */}
            <ellipse cx="15" cy="50" rx="8" ry="18" fill="#d4a574" />
            <ellipse cx="16" cy="50" rx="6" ry="16" fill="url(#palmGradient)" />

            {/* Wrist crease lines */}
            <line x1="8" y1="45" x2="22" y2="45" stroke="#c19463" strokeWidth="0.8" opacity="0.4" />
            <line x1="8" y1="55" x2="22" y2="55" stroke="#c19463" strokeWidth="0.8" opacity="0.4" />

            {/* Palm */}
            <ellipse cx="45" cy="50" rx="18" ry="22" fill="#d4a574" />
            <ellipse cx="45" cy="50" rx="15" ry="19" fill="url(#palmGradient)" />

            {/* Palm lines */}
            <path d="M 35 38 Q 42 45 48 52" stroke="#c19463" strokeWidth="1" fill="none" opacity="0.5" />
            <path d="M 32 48 Q 40 50 50 48" stroke="#c19463" strokeWidth="1" fill="none" opacity="0.5" />
            <path d="M 35 58 Q 42 55 50 53" stroke="#c19463" strokeWidth="0.8" fill="none" opacity="0.4" />

            {/* Closed fist */}
            {!isOpen && (
                <>
                    <g>
                        {/* Pinky */}
                        <ellipse cx="60" cy="62" rx="5" ry="6" fill="#d4a574" />
                        <ellipse cx="60" cy="62" rx="3.5" ry="4.5" fill="url(#fingerGradient)" />
                        <ellipse cx="60" cy="60" rx="2" ry="2" fill="#c19463" opacity="0.6" />

                        {/* Ring finger */}
                        <ellipse cx="62" cy="52" rx="5.5" ry="7" fill="#d4a574" />
                        <ellipse cx="62" cy="52" rx="4" ry="5.5" fill="url(#fingerGradient)" />
                        <ellipse cx="62" cy="50" rx="2.2" ry="2.2" fill="#c19463" opacity="0.6" />

                        {/* Middle finger */}
                        <ellipse cx="62" cy="42" rx="5.5" ry="7" fill="#d4a574" />
                        <ellipse cx="62" cy="42" rx="4" ry="5.5" fill="url(#fingerGradient)" />
                        <ellipse cx="62" cy="40" rx="2.2" ry="2.2" fill="#c19463" opacity="0.6" />

                        {/* Index finger */}
                        <ellipse cx="60" cy="32" rx="5" ry="6" fill="#d4a574" />
                        <ellipse cx="60" cy="32" rx="3.5" ry="4.5" fill="url(#fingerGradient)" />
                        <ellipse cx="60" cy="30" rx="2" ry="2" fill="#c19463" opacity="0.6" />

                        {/* Thumb wrapped around */}
                        <ellipse cx="48" cy="68" rx="8" ry="6" fill="#d4a574" />
                        <ellipse cx="48" cy="68" rx="6" ry="4.5" fill="url(#fingerGradient)" />
                        <ellipse cx="46" cy="67" rx="2.5" ry="2" fill="#c19463" opacity="0.5" />
                    </g>
                </>
            )}

            {/* Open hand */}
            {isOpen && (
                <>
                    {/* Pinky */}
                    <g>
                        <rect x="54" y="33" width="4" height="3" fill="#d4a574" rx="1" />
                        <rect x="54.5" y="33.5" width="3" height="2" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="58" y="33" width="5" height="3" fill="#d4a574" rx="1" />
                        <rect x="58.5" y="33.5" width="4" height="2" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="63" y="33.25" width="4" height="2.5" fill="#d4a574" rx="1" />
                        <rect x="63.5" y="33.5" width="3" height="1.8" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="67" y="33.5" width="3" height="2" fill="#d4a574" rx="1" />
                        <rect x="67.5" y="33.75" width="2" height="1.5" fill="url(#fingerGradient)" rx="0.8" />
                        <ellipse cx="71.5" cy="34.5" rx="2" ry="2" fill="#d4a574" />
                        <ellipse cx="71.5" cy="34.5" rx="1.5" ry="1.5" fill="url(#fingerGradient)" />
                        <ellipse cx="71.5" cy="34.5" rx="0.9" ry="0.9" fill="#f5e6d3" opacity="0.8" />
                        <ellipse cx="71.8" cy="34.5" rx="0.7" ry="0.7" fill="#ffd4d4" opacity="0.4" />
                    </g>

                    {/* Ring finger */}
                    <g>
                        <rect x="54" y="40" width="6" height="4.5" fill="#d4a574" rx="1" />
                        <rect x="54.5" y="40.5" width="5" height="3.5" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="60" y="40" width="8" height="4.5" fill="#d4a574" rx="1" />
                        <rect x="60.5" y="40.5" width="7" height="3.5" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="68" y="40.5" width="7" height="4" fill="#d4a574" rx="1" />
                        <rect x="68.5" y="41" width="6" height="3" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="75" y="41" width="6" height="3.5" fill="#d4a574" rx="1" />
                        <rect x="75.5" y="41.5" width="5" height="2.5" fill="url(#fingerGradient)" rx="0.8" />
                        <ellipse cx="83" cy="42.5" rx="3.5" ry="3.5" fill="#d4a574" />
                        <ellipse cx="83" cy="42.5" rx="2.5" ry="2.5" fill="url(#fingerGradient)" />
                        <ellipse cx="83" cy="42.5" rx="1.5" ry="1.5" fill="#f5e6d3" opacity="0.8" />
                        <ellipse cx="83.5" cy="42.5" rx="1.2" ry="1.3" fill="#ffd4d4" opacity="0.4" />
                    </g>

                    {/* Middle finger */}
                    <g>
                        <rect x="54" y="50" width="6" height="5" fill="#d4a574" rx="1" />
                        <rect x="54.5" y="50.5" width="5" height="4" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="60" y="50" width="10" height="5" fill="#d4a574" rx="1" />
                        <rect x="60.5" y="50.5" width="9" height="4" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="70" y="50.5" width="9" height="4.5" fill="#d4a574" rx="1" />
                        <rect x="70.5" y="51" width="8" height="3.5" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="79" y="51" width="8" height="4" fill="#d4a574" rx="1" />
                        <rect x="79.5" y="51.5" width="7" height="3" fill="url(#fingerGradient)" rx="0.8" />
                        <ellipse cx="89" cy="52.5" rx="4" ry="4" fill="#d4a574" />
                        <ellipse cx="89" cy="52.5" rx="3" ry="3" fill="url(#fingerGradient)" />
                        <ellipse cx="89" cy="52.5" rx="1.8" ry="1.8" fill="#f5e6d3" opacity="0.8" />
                        <ellipse cx="89.5" cy="52.5" rx="1.5" ry="1.5" fill="#ffd4d4" opacity="0.4" />
                    </g>

                    {/* Index finger */}
                    <g>
                        <rect x="54" y="57" width="6" height="4" fill="#d4a574" rx="1" />
                        <rect x="54.5" y="57.5" width="5" height="3" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="60" y="56.5" width="8" height="4.5" fill="#d4a574" rx="1" />
                        <rect x="60.5" y="57" width="7" height="3.5" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="68" y="57" width="7" height="4" fill="#d4a574" rx="1" />
                        <rect x="68.5" y="57.5" width="6" height="3" fill="url(#fingerGradient)" rx="0.8" />
                        <rect x="75" y="57.5" width="6" height="3.5" fill="#d4a574" rx="1" />
                        <rect x="75.5" y="58" width="5" height="2.5" fill="url(#fingerGradient)" rx="0.8" />
                        <ellipse cx="83" cy="59" rx="3.5" ry="3.5" fill="#d4a574" />
                        <ellipse cx="83" cy="59" rx="2.5" ry="2.5" fill="url(#fingerGradient)" />
                        <ellipse cx="83" cy="59" rx="1.5" ry="1.5" fill="#f5e6d3" opacity="0.8" />
                        <ellipse cx="83.5" cy="59" rx="1.2" ry="1.3" fill="#ffd4d4" opacity="0.4" />
                    </g>

                    {/* Thumb */}
                    <g>
                        <rect x="48" y="65" width="6" height="8" fill="#d4a574" rx="1.5" />
                        <rect x="48.5" y="65.5" width="5" height="7" fill="url(#fingerGradient)" rx="1.2" />
                        <rect x="54" y="65.5" width="6" height="7" fill="#d4a574" rx="2" />
                        <rect x="54.5" y="66" width="5" height="6" fill="url(#fingerGradient)" rx="1.5" />
                        <rect x="60" y="66" width="5" height="6.5" fill="#d4a574" rx="2" />
                        <rect x="60.5" y="66.5" width="4" height="5.5" fill="url(#fingerGradient)" rx="1.5" />
                        <ellipse cx="67" cy="69" rx="4.5" ry="5.5" fill="#d4a574" />
                        <ellipse cx="67" cy="69" rx="3.5" ry="4.5" fill="url(#fingerGradient)" />
                        <ellipse cx="67" cy="69" rx="2" ry="2.5" fill="#f5e6d3" opacity="0.8" />
                        <ellipse cx="67.5" cy="69" rx="1.5" ry="1.8" fill="#ffd4d4" opacity="0.4" />
                    </g>

                    {/* Knuckle joints */}
                    <ellipse cx="54" cy="34.5" rx="1.8" ry="1.8" fill="#c19463" opacity="0.3" />
                    <ellipse cx="54" cy="42.5" rx="2" ry="2" fill="#c19463" opacity="0.3" />
                    <ellipse cx="54" cy="52.5" rx="2.2" ry="2.2" fill="#c19463" opacity="0.3" />
                    <ellipse cx="54" cy="59" rx="2" ry="2" fill="#c19463" opacity="0.3" />
                    <ellipse cx="48" cy="69" rx="2.8" ry="2.8" fill="#c19463" opacity="0.3" />
                </>
            )}

            {/* Shadow beneath hand */}
            <ellipse cx="45" cy="82" rx="25" ry="4" fill="#000000" opacity="0.2" />
        </svg>
    );
}
