'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { Star } from 'lucide-react';

export default function FavoritesPage() {
  const favorites = [
    { id: 1, title: 'Asset Dashboard', path: '/assets', module: 'Assets' },
    { id: 2, title: 'Work Orders', path: '/maintenance/work-orders', module: 'Maintenance' },
    { id: 3, title: 'Inventory Items', path: '/inventory/items', module: 'Inventory' },
    { id: 4, title: 'Production Reports', path: '/reports/production-reports', module: 'Reports' }
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Favorites</h1>
          <p className="text-gray-600 mt-1">Your bookmarked pages</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => (
            <div key={fav.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900">{fav.title}</h3>
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              </div>
              <p className="text-sm text-gray-600">{fav.module}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
