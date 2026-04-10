'use client';

import { Star } from 'lucide-react';

export function SavedFilters() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
        <Star className="h-4 w-4" />
        Save Current Filter
      </button>
    </div>
  );
}
