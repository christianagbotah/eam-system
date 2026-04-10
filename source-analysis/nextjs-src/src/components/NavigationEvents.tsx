'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationEvents() {
  const pathname = usePathname();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && !link.target && link.href.startsWith(window.location.origin)) {
        const loader = document.getElementById('top-loader');
        if (loader) {
          loader.style.width = '70%';
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

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
      }, 100);
    }
  }, [pathname]);

  return null;
}
