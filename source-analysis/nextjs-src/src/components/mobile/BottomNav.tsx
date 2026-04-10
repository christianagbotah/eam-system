'use client';

import Link from 'next/link';
import { Home, Package, Wrench, BarChart3 } from 'lucide-react';

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t z-40">
      <div className="flex justify-around h-16">
        <Link href="/admin/dashboard" className="flex flex-col items-center justify-center flex-1">
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1">Home</span>
        </Link>
        <Link href="/admin/assets" className="flex flex-col items-center justify-center flex-1">
          <Package className="h-6 w-6" />
          <span className="text-xs mt-1">Assets</span>
        </Link>
        <Link href="/admin/work-orders" className="flex flex-col items-center justify-center flex-1">
          <Wrench className="h-6 w-6" />
          <span className="text-xs mt-1">Orders</span>
        </Link>
        <Link href="/admin/analytics" className="flex flex-col items-center justify-center flex-1">
          <BarChart3 className="h-6 w-6" />
          <span className="text-xs mt-1">Analytics</span>
        </Link>
      </div>
    </nav>
  );
}
