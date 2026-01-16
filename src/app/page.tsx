import { Suspense } from 'react';
import HomePage from '@/components/HomePage';

function HomePageWrapper() {
  return <HomePage />;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <HomePageWrapper />
    </Suspense>
  );
}


