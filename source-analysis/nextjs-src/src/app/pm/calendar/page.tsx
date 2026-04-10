'use client';

import { useState } from 'react';
import PMSchedulingCalendar from '@/components/pm/PMSchedulingCalendar';
import PMCalendarFilters from '@/components/pm/PMCalendarFilters';

export default function PMCalendarPage() {
  const [filters, setFilters] = useState({});

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="mb-6">
        <h1 className="text-base font-semibold text-gray-900">PM Scheduling Calendar</h1>
        <p className="text-gray-600">Drag and drop to reschedule PM tasks</p>
      </div>

      <PMCalendarFilters onFiltersChange={setFilters} />
      
      <div className="flex-1 min-h-0">
        <PMSchedulingCalendar filters={filters} />
      </div>
    </div>
  );
}
