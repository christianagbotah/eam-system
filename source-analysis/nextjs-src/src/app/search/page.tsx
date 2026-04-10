'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Search as SearchIcon } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results] = useState([
    { id: 1, title: 'Asset #12345', type: 'Asset', module: 'Assets' },
    { id: 2, title: 'Work Order #WO-001', type: 'Work Order', module: 'Maintenance' },
    { id: 3, title: 'Inventory Item #INV-123', type: 'Item', module: 'Inventory' }
  ]);

  const filteredResults = results.filter(r =>
    r.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Global Search</h1>
          <p className="text-gray-600 mt-1">Search across all modules</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search anything..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg" />
          </div>
        </div>

        {query && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {filteredResults.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No results found</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredResults.map((result) => (
                  <div key={result.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                    <h3 className="font-semibold text-gray-900">{result.title}</h3>
                    <p className="text-sm text-gray-600">{result.type} • {result.module}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
