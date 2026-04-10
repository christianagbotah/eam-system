'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';

interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  sidebar: string;
}

interface ThemeContextType {
  theme: Theme;
  loading: boolean;
  updateTheme: (newTheme: Theme) => Promise<void>;
}

const defaultTheme: Theme = {
  primary: 'blue',
  secondary: 'indigo',
  accent: 'purple',
  sidebar: 'blue'
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  loading: true,
  updateTheme: async () => {}
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const res = await api.get('/settings/theme');
      if (res.data?.data) {
        setTheme(res.data.data);
      }
    } catch (error) {
      // Theme endpoint not available, use default theme
      console.debug('Using default theme');
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = async (newTheme: Theme) => {
    try {
      await api.put('/settings/theme', newTheme);
      setTheme(newTheme);
    } catch (error) {
      throw error;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, loading, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const getThemeClasses = (theme: Theme) => ({
  primary: {
    bg: `bg-${theme.primary}-600`,
    bgHover: `hover:bg-${theme.primary}-700`,
    text: `text-${theme.primary}-600`,
    border: `border-${theme.primary}-500`,
    gradient: `from-${theme.primary}-600 to-${theme.secondary}-600`
  },
  sidebar: {
    bg: `from-${theme.sidebar}-900 to-${theme.sidebar}-800`,
    border: `border-${theme.sidebar}-700`,
    hover: `hover:bg-${theme.sidebar}-700`,
    active: `bg-${theme.sidebar}-700`
  }
});
