'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loader = document.getElementById('top-loader');
    if (loader) {
      loader.style.width = '100%';
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => {
          loader.style.width = '0%';
          loader.style.opacity = '1';
        }, 200);
      }, 200);
    }
  }, [pathname, searchParams]);

  return (
    <div
      id="top-loader"
      className="fixed top-0 left-0 h-1 bg-blue-600 transition-all duration-200 ease-out z-[9999]"
      style={{ width: '0%' }}
    />
  );
}
