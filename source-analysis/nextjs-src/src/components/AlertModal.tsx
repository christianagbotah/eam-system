'use client';

import { useEffect, useState } from 'react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export default function AlertModal({ isOpen, onClose, title, message, type = 'info' }: AlertModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  const styles = {
    success: {
      bg: 'bg-green-100',
      icon: 'bg-green-500',
      outer: 'bg-green-200',
      button: 'bg-green-600 hover:bg-green-700',
      svg: (
        <svg className="w-6 h-6 text-white animate-[scale-in_0.3s_ease-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-red-100',
      icon: 'bg-red-500',
      outer: 'bg-red-200',
      button: 'bg-red-600 hover:bg-red-700',
      svg: (
        <svg className="w-6 h-6 text-white animate-[shake_0.4s_ease-in-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-yellow-100',
      icon: 'bg-yellow-500',
      outer: 'bg-yellow-200',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      svg: (
        <svg className="w-6 h-6 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-blue-100',
      icon: 'bg-blue-500',
      outer: 'bg-blue-200',
      button: 'bg-blue-600 hover:bg-blue-700',
      svg: (
        <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const style = styles[type];

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 transition-all duration-300 ${
      isVisible ? 'bg-black bg-opacity-50' : 'bg-black bg-opacity-0'
    }`}>
      <div className={`bg-white rounded-2xl shadow-2xl max-w-sm w-full transform transition-all duration-300 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        <div className="p-6 text-center">
          <div className={`mx-auto flex items-center justify-center h-20 w-20 rounded-full ${style.outer} mb-4`} style={{ animation: 'ripple 0.6s ease-out, pulse-grow 2s ease-in-out 0.6s infinite' }}>
            <div className={`flex items-center justify-center h-16 w-16 rounded-full ${style.icon} animate-[scale-in_0.4s_ease-out]`}>
              {style.svg}
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
        <div className="px-6 pb-6 flex justify-center">
          <button
            onClick={onClose}
            className={`${style.button} text-white py-2 px-8 rounded-lg font-medium transition-colors`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
