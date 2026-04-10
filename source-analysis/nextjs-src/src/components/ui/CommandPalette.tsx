'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  if (!open) return null;

  const commands = [
    { label: 'Dashboard', action: () => router.push('/admin/dashboard') },
    { label: 'Assets', action: () => router.push('/admin/assets') },
    { label: 'Work Orders', action: () => router.push('/admin/work-orders') },
    { label: 'Hierarchy', action: () => router.push('/admin/hierarchy') },
  ];

  const filtered = commands.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => onOpenChange(false)}>
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 opacity-50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type a command..."
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none"
            />
            <button onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {filtered.map((cmd, i) => (
              <button
                key={i}
                onClick={() => { cmd.action(); onOpenChange(false); }}
                className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
