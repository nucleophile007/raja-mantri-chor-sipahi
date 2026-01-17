// Pixel art character components for RMCS game

export const PixelRaja = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
    {/* Crown */}
    <rect x="4" y="2" width="2" height="2" fill="#FFD700" />
    <rect x="6" y="1" width="4" height="2" fill="#FFD700" />
    <rect x="10" y="2" width="2" height="2" fill="#FFD700" />
    {/* Head */}
    <rect x="5" y="3" width="6" height="5" fill="#FDB797" />
    {/* Eyes */}
    <rect x="6" y="5" width="1" height="1" fill="#001858" />
    <rect x="9" y="5" width="1" height="1" fill="#001858" />
    {/* Body */}
    <rect x="4" y="8" width="8" height="5" fill="#8B4513" />
    {/* Arms */}
    <rect x="3" y="9" width="1" height="3" fill="#FDB797" />
    <rect x="12" y="9" width="1" height="3" fill="#FDB797" />
    {/* Legs */}
    <rect x="5" y="13" width="2" height="3" fill="#654321" />
    <rect x="9" y="13" width="2" height="3" fill="#654321" />
  </svg>
);

export const PixelMantri = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
    {/* Turban */}
    <rect x="4" y="1" width="8" height="3" fill="#FF6B6B" />
    <rect x="5" y="2" width="1" height="1" fill="#FFD700" />
    {/* Head */}
    <rect x="5" y="4" width="6" height="4" fill="#FDB797" />
    {/* Eyes */}
    <rect x="6" y="6" width="1" height="1" fill="#001858" />
    <rect x="9" y="6" width="1" height="1" fill="#001858" />
    {/* Mustache */}
    <rect x="5" y="7" width="2" height="1" fill="#000000" />
    <rect x="9" y="7" width="2" height="1" fill="#000000" />
    {/* Body */}
    <rect x="4" y="8" width="8" height="5" fill="#4ECDC4" />
    {/* Arms */}
    <rect x="3" y="9" width="1" height="3" fill="#FDB797" />
    <rect x="12" y="9" width="1" height="3" fill="#FDB797" />
    {/* Legs */}
    <rect x="5" y="13" width="2" height="3" fill="#2C3E50" />
    <rect x="9" y="13" width="2" height="3" fill="#2C3E50" />
  </svg>
);

export const PixelChor = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
    {/* Mask */}
    <rect x="4" y="2" width="8" height="4" fill="#000000" />
    <rect x="6" y="4" width="1" height="1" fill="#FFFFFF" />
    <rect x="9" y="4" width="1" height="1" fill="#FFFFFF" />
    {/* Head */}
    <rect x="5" y="6" width="6" height="2" fill="#FDB797" />
    {/* Body - striped shirt */}
    <rect x="4" y="8" width="8" height="1" fill="#000000" />
    <rect x="4" y="9" width="8" height="1" fill="#FFFFFF" />
    <rect x="4" y="10" width="8" height="1" fill="#000000" />
    <rect x="4" y="11" width="8" height="1" fill="#FFFFFF" />
    <rect x="4" y="12" width="8" height="1" fill="#000000" />
    {/* Arms */}
    <rect x="3" y="9" width="1" height="3" fill="#FDB797" />
    <rect x="12" y="9" width="1" height="3" fill="#FDB797" />
    {/* Legs */}
    <rect x="5" y="13" width="2" height="3" fill="#000000" />
    <rect x="9" y="13" width="2" height="3" fill="#000000" />
  </svg>
);

export const PixelSipahi = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
    {/* Helmet */}
    <rect x="4" y="1" width="8" height="3" fill="#708090" />
    <rect x="7" y="1" width="2" height="1" fill="#FF0000" />
    {/* Head */}
    <rect x="5" y="4" width="6" height="4" fill="#FDB797" />
    {/* Eyes */}
    <rect x="6" y="6" width="1" height="1" fill="#001858" />
    <rect x="9" y="6" width="1" height="1" fill="#001858" />
    {/* Body - uniform */}
    <rect x="4" y="8" width="8" height="5" fill="#228B22" />
    <rect x="7" y="9" width="2" height="3" fill="#FFD700" />
    {/* Arms */}
    <rect x="3" y="9" width="1" height="3" fill="#FDB797" />
    <rect x="12" y="9" width="1" height="3" fill="#FDB797" />
    {/* Legs */}
    <rect x="5" y="13" width="2" height="3" fill="#2C3E50" />
    <rect x="9" y="13" width="2" height="3" fill="#2C3E50" />
  </svg>
);

export const PixelQuestionMark = ({ size = 64 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
    <rect x="0" y="0" width="16" height="16" fill="#F582AE" rx="2" />
    <rect x="6" y="3" width="4" height="2" fill="#FFF" />
    <rect x="8" y="5" width="2" height="2" fill="#FFF" />
    <rect x="7" y="7" width="2" height="3" fill="#FFF" />
    <rect x="7" y="11" width="2" height="2" fill="#FFF" />
  </svg>
);

export const PixelCoin = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
    <circle cx="8" cy="8" r="7" fill="#FFD700" />
    <circle cx="8" cy="8" r="5" fill="#FFA500" />
    <rect x="6" y="6" width="4" height="4" fill="#FFD700" />
    <text x="8" y="11" fontSize="8" textAnchor="middle" fill="#8B4513" fontWeight="bold">₹</text>
  </svg>
);

export const PixelDice = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
    <rect x="2" y="2" width="12" height="12" fill="#FFF" stroke="#001858" strokeWidth="2" />
    <circle cx="5" cy="5" r="1.5" fill="#001858" />
    <circle cx="8" cy="8" r="1.5" fill="#001858" />
    <circle cx="11" cy="11" r="1.5" fill="#001858" />
  </svg>
);

export const PixelHeart = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
    <rect x="3" y="4" width="2" height="2" fill="#FF1654" />
    <rect x="5" y="3" width="2" height="2" fill="#FF1654" />
    <rect x="7" y="3" width="2" height="2" fill="#FF1654" />
    <rect x="9" y="4" width="2" height="2" fill="#FF1654" />
    <rect x="2" y="6" width="10" height="2" fill="#FF1654" />
    <rect x="3" y="8" width="8" height="2" fill="#FF1654" />
    <rect x="4" y="10" width="6" height="2" fill="#FF1654" />
    <rect x="6" y="12" width="2" height="2" fill="#FF1654" />
  </svg>
);
