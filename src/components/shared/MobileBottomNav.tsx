'use client';

import React from 'react';
import { useNavigationStore } from '@/stores/navigationStore';
import type { PageName } from '@/types';
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Bell,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  page: PageName;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { page: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { page: 'maintenance-requests', label: 'Requests', icon: ClipboardList },
  { page: 'work-orders', label: 'Work Orders', icon: Wrench },
  { page: 'notifications', label: 'Alerts', icon: Bell },
];

interface MobileBottomNavProps {
  onMenuOpen?: () => void;
}

export function MobileBottomNav({ onMenuOpen }: MobileBottomNavProps) {
  const currentPage = useNavigationStore((s) => s.currentPage);
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-40',
        'lg:hidden',
        'bg-background/95 backdrop-blur-lg border-t border-border',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="flex items-center justify-around h-16">
        {/* Left spacer + More menu */}
        <button
          onClick={onMenuOpen}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 w-16 h-full',
            'text-muted-foreground active:text-foreground transition-colors',
          )}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>

        {/* Nav items */}
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.page || (
            item.page === 'work-orders' && currentPage === 'work-orders'
          ) || (
            item.page === 'maintenance-requests' && currentPage === 'maintenance-requests'
          );
          const Icon = item.icon;

          return (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-16 h-full',
                'transition-colors relative',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground',
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5px]')} />
              <span className={cn(
                'text-[10px] font-medium leading-none',
                isActive && 'font-semibold',
              )}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Right spacer to balance the More button */}
        <div className="w-16 h-full" />
      </div>
    </nav>
  );
}
