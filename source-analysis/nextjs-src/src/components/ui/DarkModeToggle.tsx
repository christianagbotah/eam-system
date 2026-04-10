'use client';

import { Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useEffect } from 'react';

export function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useUIStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      aria-label="Toggle dark mode"
    >
      {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
