'use client';

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import LoginPage from '@/components/LoginPage';

// Lazy load the heavy app shell - it only downloads after the user logs in
const EAMApp = lazy(() => import('@/components/EAMApp'));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center animate-pulse shadow-lg">
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 20h20M5 20V8l7-5 7 5v12M9 20v-6h6v6" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">iAssetsPro</h2>
          <p className="text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
        <div className="flex gap-1 justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]" />
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Ensure we're mounted before rendering
  useEffect(() => {
    React.startTransition(() => setMounted(true));
  }, []);

  if (!mounted) {
    return <LoadingScreen />;
  }

  // Not logged in → show the lightweight LoginPage (no lazy loading needed)
  if (!user) {
    return <LoginPage />;
  }

  // Logged in → lazy-load the heavy EAMApp with a Suspense fallback
  return (
    <Suspense fallback={<LoadingScreen />}>
      <EAMApp />
    </Suspense>
  );
}
