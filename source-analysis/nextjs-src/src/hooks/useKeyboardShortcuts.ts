// Keyboard Shortcuts Hook - Feature #3
import { useHotkeys } from 'react-hotkeys-hook';
import { useRouter } from 'next/navigation';

export const useKeyboardShortcuts = (callbacks?: {
  onNew?: () => void;
  onSave?: () => void;
  onExport?: () => void;
  onSearch?: () => void;
  onClose?: () => void;
  onHelp?: () => void;
}) => {
  const router = useRouter();

  // Global search: Ctrl/Cmd + K
  useHotkeys('ctrl+k, cmd+k', (e) => {
    e.preventDefault();
    callbacks?.onSearch?.() || document.getElementById('global-search')?.focus();
  });

  // New item: Ctrl/Cmd + N
  useHotkeys('ctrl+n, cmd+n', (e) => {
    e.preventDefault();
    callbacks?.onNew?.();
  });

  // Save: Ctrl/Cmd + S
  useHotkeys('ctrl+s, cmd+s', (e) => {
    e.preventDefault();
    callbacks?.onSave?.();
  });

  // Export: Ctrl/Cmd + E
  useHotkeys('ctrl+e, cmd+e', (e) => {
    e.preventDefault();
    callbacks?.onExport?.();
  });

  // Close modal: Esc
  useHotkeys('esc', () => {
    callbacks?.onClose?.();
  });

  // Focus search: /
  useHotkeys('/', (e) => {
    e.preventDefault();
    document.getElementById('page-search')?.focus();
  });

  // Show shortcuts help: ?
  useHotkeys('shift+/', (e) => {
    e.preventDefault();
    callbacks?.onHelp?.();
  });
};

export const shortcuts = [
  { key: 'Ctrl+K', mac: '⌘K', action: 'Quick search' },
  { key: 'Ctrl+N', mac: '⌘N', action: 'New item' },
  { key: 'Ctrl+S', mac: '⌘S', action: 'Save' },
  { key: 'Ctrl+E', mac: '⌘E', action: 'Export' },
  { key: 'Esc', mac: 'Esc', action: 'Close modal' },
  { key: '/', mac: '/', action: 'Focus search' },
  { key: '?', mac: '?', action: 'Show shortcuts' }
];
