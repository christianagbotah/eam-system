'use client';

import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  variant?: 'danger' | 'info';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => onOpenChange(false)}>
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onOpenChange(false); }}
            className={`px-4 py-2 text-sm text-white rounded-lg ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
