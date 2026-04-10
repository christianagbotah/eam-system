'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

export function GlobalSearch() {
  const [query, setQuery] = useState('');

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-full pl-10 pr-4 py-2 border rounded-lg"
      />
    </div>
  );
}
