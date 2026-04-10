import { create } from 'zustand';

interface FilterStore {
  savedFilters: any[];
  activeFilter: string | null;
}

export const useFilterStore = create<FilterStore>()((set) => ({
  savedFilters: [],
  activeFilter: null,
}));
