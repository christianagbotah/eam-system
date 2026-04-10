import { create } from 'zustand';

interface UIStore {
  darkMode: boolean;
  commandPaletteOpen: boolean;
  toggleDarkMode: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  darkMode: false,
  commandPaletteOpen: false,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
