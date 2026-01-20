// Pixel art character components for RMCS game
import Image from 'next/image';

export const PixelRaja = ({ size = 64 }: { size?: number }) => (
  <Image
    src="/characters/raja.png"
    alt="Raja"
    width={size}
    height={size}
    style={{ imageRendering: 'pixelated' }}
  />
);

export const PixelMantri = ({ size = 64 }: { size?: number }) => (
  <Image
    src="/characters/mantri.png"
    alt="Mantri"
    width={size}
    height={size}
    style={{ imageRendering: 'pixelated' }}
  />
);

export const PixelChor = ({ size = 64 }: { size?: number }) => (
  <Image
    src="/characters/chor.png"
    alt="Chor"
    width={size}
    height={size}
    style={{ imageRendering: 'pixelated' }}
  />
);

export const PixelSipahi = ({ size = 64 }: { size?: number }) => (
  <Image
    src="/characters/sipahi.png"
    alt="Sipahi"
    width={size}
    height={size}
    style={{ imageRendering: 'pixelated' }}
  />
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
