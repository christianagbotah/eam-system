'use client';

import { ReactNode } from 'react';

interface LoadingButtonProps {
  onClick: () => void | Promise<void>;
  loading?: boolean;
  disabled?: boolean;
  children: ReactNode;
  loadingText?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function LoadingButton({
  onClick,
  loading = false,
  disabled = false,
  children,
  loadingText = 'Loading...',
  className = '',
  type = 'button'
}: LoadingButtonProps) {
  const handleClick = async () => {
    if (loading || disabled) return;
    await onClick();
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}