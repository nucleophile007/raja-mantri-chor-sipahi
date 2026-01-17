import { Suspense } from 'react';
import HomePage from '@/components/HomePage';
import { PixelDice } from '@/components/PixelCharacters';

function HomePageWrapper() {
  return <HomePage />;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pixel-grid flex items-center justify-center" style={{ background: 'var(--pixel-bg)' }}>
        <div className="text-center">
          <div className="pixel-float mb-4">
            <PixelDice size={64} />
          </div>
          <div className="pixel-spinner mx-auto mb-4"></div>
          <p className="pixel-text" style={{ color: 'var(--pixel-dark)' }}>Loading...</p>
        </div>
      </div>
    }>
      <HomePageWrapper />
    </Suspense>
  );
}
