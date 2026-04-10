// Dark Mode Hook - Feature #15
'use client';
import { useEffect, useState } from 'react';

export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check localStorage
    const stored = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = stored ? stored === 'true' : prefersDark;
    
    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  return { isDark, toggle };
};
