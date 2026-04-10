'use client';

import { Plus } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { ReactNode } from 'react';

interface QuickAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="fixed bottom-20 md:bottom-6 right-6 h-14 w-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-40">
          <Plus className="h-6 w-6" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50"
          sideOffset={10}
          align="end"
        >
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {action.icon}
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
