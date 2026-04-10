'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  loadingRequests: Set<string>;
  startLoading: (requestId: string) => void;
  stopLoading: (requestId: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingRequests, setLoadingRequests] = useState<Set<string>>(new Set());

  const startLoading = (requestId: string) => {
    setLoadingRequests(prev => new Set(prev).add(requestId));
  };

  const stopLoading = (requestId: string) => {
    setLoadingRequests(prev => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  };

  return (
    <LoadingContext.Provider value={{
      isLoading: loadingRequests.size > 0,
      loadingRequests,
      startLoading,
      stopLoading
    }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}