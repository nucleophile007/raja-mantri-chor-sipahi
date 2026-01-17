import { 
  PixelRaja, 
  PixelMantri, 
  PixelChor, 
  PixelSipahi,
  PixelQuestionMark,
  PixelCoin,
  PixelDice,
  PixelHeart
} from './PixelCharacters';
import ChitMixAnimation from './ChitMixAnimation';

export default function PixelArtShowcase() {
  return (
    <div className="min-h-screen pixel-grid p-8" style={{ background: 'var(--pixel-bg)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="pixel-text-xl mb-4" style={{ color: 'var(--pixel-dark)' }}>
            RMCS Pixel Art
          </h1>
          <p className="text-lg" style={{ color: 'var(--pixel-dark)' }}>
            🎮 Retro-inspired UI/UX Design System
          </p>
        </div>

        {/* Chit Mix Animation Section */}
        <div className="pixel-card p-8 mb-8">
          <h2 className="pixel-text-lg mb-6" style={{ color: 'var(--pixel-dark)' }}>
            Chit Mix Animation
          </h2>
          <p className="mb-6 text-slate-700">
            Watch as the chits are released from hand, mixed in the air, and fall to the ground!
          </p>
          <ChitMixAnimation />
        </div>

        {/* Characters Section */}
        <div className="pixel-card p-8 mb-8">
          <h2 className="pixel-text-lg mb-6" style={{ color: 'var(--pixel-dark)' }}>
            Characters
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="pixel-card-hover p-6 bg-amber-50 rounded-lg">
                <PixelRaja size={96} />
              </div>
              <p className="mt-3 font-bold" style={{ color: 'var(--pixel-dark)' }}>👑 Raja</p>
            </div>
            <div className="text-center">
              <div className="pixel-card-hover p-6 bg-blue-50 rounded-lg">
                <PixelMantri size={96} />
              </div>
              <p className="mt-3 font-bold" style={{ color: 'var(--pixel-dark)' }}>🎯 Mantri</p>
            </div>
            <div className="text-center">
              <div className="pixel-card-hover p-6 bg-gray-50 rounded-lg">
                <PixelChor size={96} />
              </div>
              <p className="mt-3 font-bold" style={{ color: 'var(--pixel-dark)' }}>🦹 Chor</p>
            </div>
            <div className="text-center">
              <div className="pixel-card-hover p-6 bg-green-50 rounded-lg">
                <PixelSipahi size={96} />
              </div>
              <p className="mt-3 font-bold" style={{ color: 'var(--pixel-dark)' }}>⚔️ Sipahi</p>
            </div>
          </div>
        </div>

        {/* Buttons Section */}
        <div className="pixel-card p-8 mb-8">
          <h2 className="pixel-text-lg mb-6" style={{ color: 'var(--pixel-dark)' }}>
            Buttons
          </h2>
          <div className="flex flex-wrap gap-4">
            <button className="pixel-btn">
              Primary Button
            </button>
            <button className="pixel-btn pixel-btn-secondary">
              Secondary Button
            </button>
            <button className="pixel-btn pixel-btn-accent">
              Accent Button
            </button>
            <button className="pixel-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
              Disabled Button
            </button>
          </div>
        </div>

        {/* Icons Section */}
        <div className="pixel-card p-8 mb-8">
          <h2 className="pixel-text-lg mb-6" style={{ color: 'var(--pixel-dark)' }}>
            Icons & Elements
          </h2>
          <div className="flex flex-wrap gap-8 items-center">
            <div className="text-center">
              <PixelQuestionMark size={64} />
              <p className="mt-2 text-sm">Mystery</p>
            </div>
            <div className="text-center">
              <PixelCoin size={48} />
              <p className="mt-2 text-sm">Points</p>
            </div>
            <div className="text-center">
              <PixelDice size={48} />
              <p className="mt-2 text-sm">Random</p>
            </div>
            <div className="text-center pixel-float">
              <PixelHeart size={48} />
              <p className="mt-2 text-sm">Favorite</p>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="pixel-card p-8 mb-8">
          <h2 className="pixel-text-lg mb-6" style={{ color: 'var(--pixel-dark)' }}>
            Color Palette
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-7 gap-4">
            <div className="text-center">
              <div className="w-20 h-20 rounded-lg pixel-card" style={{ background: 'var(--pixel-bg)' }}></div>
              <p className="mt-2 text-xs">Background</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-lg pixel-card" style={{ background: 'var(--pixel-primary)' }}></div>
              <p className="mt-2 text-xs">Primary</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-lg pixel-card" style={{ background: 'var(--pixel-secondary)' }}></div>
              <p className="mt-2 text-xs">Secondary</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-lg pixel-card" style={{ background: 'var(--pixel-accent)' }}></div>
              <p className="mt-2 text-xs">Accent</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-lg pixel-card" style={{ background: 'var(--pixel-dark)' }}></div>
              <p className="mt-2 text-xs">Dark</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-lg pixel-card" style={{ background: 'var(--pixel-success)' }}></div>
              <p className="mt-2 text-xs">Success</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-lg pixel-card" style={{ background: 'var(--pixel-danger)' }}></div>
              <p className="mt-2 text-xs">Danger</p>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="pixel-card p-8">
          <h2 className="pixel-text-lg mb-6" style={{ color: 'var(--pixel-dark)' }}>
            Typography
          </h2>
          <div className="space-y-4">
            <div className="pixel-text-xl">Pixel Heading XL</div>
            <div className="pixel-text-lg">Pixel Heading Large</div>
            <div className="pixel-text">Normal Pixel Text</div>
            <div className="text-lg">Regular Body Text (Sans-serif)</div>
            <div className="text-sm opacity-75">Small Secondary Text</div>
          </div>
        </div>

        {/* Sample Card */}
        <div className="mt-8 pixel-card p-8">
          <h2 className="pixel-text-lg mb-4" style={{ color: 'var(--pixel-dark)' }}>
            Sample Game Card
          </h2>
          <div className="flex items-center gap-6">
            <PixelMantri size={80} />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--pixel-dark)' }}>
                Your Character: Mantri
              </h3>
              <p className="mb-4">You are the minister! Find the Chor (thief) to earn points.</p>
              <button className="pixel-btn pixel-btn-accent">
                Make Your Guess
              </button>
            </div>
          </div>
        </div>

        {/* Animation Examples */}
        <div className="mt-8 pixel-card p-8">
          <h2 className="pixel-text-lg mb-6" style={{ color: 'var(--pixel-dark)' }}>
            Animations
          </h2>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="pixel-float">
                <PixelCoin size={64} />
              </div>
              <p className="mt-2 text-sm">Floating</p>
            </div>
            <div className="text-center">
              <div className="pixel-blink">
                <PixelDice size={64} />
              </div>
              <p className="mt-2 text-sm">Blinking</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
