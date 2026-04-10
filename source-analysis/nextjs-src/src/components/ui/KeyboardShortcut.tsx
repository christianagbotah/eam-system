'use client';

export function KeyboardShortcut({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, i) => (
        <kbd key={i} className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 border rounded">
          {key}
        </kbd>
      ))}
    </div>
  );
}
