'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  useEffect(() => {
    if (code) {
      // Redirect to home page with code as query parameter
      router.push(`/?code=${code.toUpperCase()}`);
    } else {
      router.push('/');
    }
  }, [code, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mb-4"></div>
        <p className="text-slate-600">Redirecting to join game...</p>
      </div>
    </div>
  );
}
