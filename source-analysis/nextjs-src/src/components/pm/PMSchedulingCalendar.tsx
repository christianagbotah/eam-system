'use client';

import { useState, useCallback } from 'react';
import { Calendar, momentLocalizer, Event, View } from 'react-big-calendar';
import moment from 'moment';
import { usePMSchedules, PMCalendarEvent } from '@/hooks/usePMSchedules';
import { toast } from 'react-hot-toast';
import PMScheduleDetailPanel from './PMScheduleDetailPanel';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface PMSchedulingCalendarProps {
  filters?: {
    facility?: string;
    asset_type?: string;
    status?: string;
    from?: string;
    to?: string;
  };
}

export default function PMSchedulingCalendar({ filters = {} }: PMSchedulingCalendarProps) {
  const [selectedEvent, setSelectedEvent] = useState<PMCalendarEvent | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<PMCalendarEvent[]>([]);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  const {
    events,
    loading,
    error,
    updateScheduleDate,
    generateWorkOrder,
    bulkGenerateWorkOrders,
    refetch
  } = usePMSchedules(filters);

  const handleSelectEvent = useCallback((event: PMCalendarEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleEventDrop = useCallback(async ({ event, start }: { event: PMCalendarEvent; start: Date }) => {
    const success = await updateScheduleDate(event.pm_schedule_id, start);
    if (success) {
      toast.success('Schedule updated successfully');
    } else {
      toast.error('Failed to update schedule');
    }
  }, [updateScheduleDate]);

  const handleEventResize = useCallback(async ({ event, start, end }: { event: PMCalendarEvent; start: Date; end: Date }) => {
    // For PM schedules, we mainly care about the start date
    const success = await updateScheduleDate(event.pm_schedule_id, start);
    if (success) {
      toast.success('Schedule updated successfully');
    } else {
      toast.error('Failed to update schedule');
    }
  }, [updateScheduleDate]);

  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    // Could be used to create new PM schedules
    console.log('Selected slot:', start, end);
  }, []);

  const handleGenerateWorkOrder = async (scheduleId: number) => {
    const result = await generateWorkOrder(scheduleId);
    if (result) {
      toast.success(`Work order ${result.work_order_number} generated`);
      setSelectedEvent(null);
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedEvents.length === 0) {
      toast.error('Please select schedules to generate work orders');
      return;
    }

    const templateIds = selectedEvents.map(event => event.pm_schedule_id);
    const result = await bulkGenerateWorkOrders(templateIds);
    if (result) {
      toast.success(`Generated ${result.count} work orders`);
      setSelectedEvents([]);
    }
  };

  const eventStyleGetter = (event: PMCalendarEvent) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';

    switch (event.status) {
      case 'waiting':
        backgroundColor = '#3b82f6';
        borderColor = '#2563eb';
        break;
      case 'generated':
        backgroundColor = '#10b981';
        borderColor = '#059669';
        break;
      case 'assigned':
        backgroundColor = '#f59e0b';
        borderColor = '#d97706';
        break;
      case 'in_progress':
        backgroundColor = '#ef4444';
        borderColor = '#dc2626';
        break;
      case 'overdue':
        backgroundColor = '#dc2626';
        borderColor = '#b91c1c';
        break;
    }

    // Priority-based opacity
    const opacity = event.priority === 'critical' ? 1 : 
                   event.priority === 'high' ? 0.9 : 
                   event.priority === 'medium' ? 0.8 : 0.7;

    return {
      style: {
        backgroundColor,
        borderColor,
        opacity,
        color: 'white',
        border: '1px solid',
        borderRadius: '4px'
      }
    };
  };

  const CustomEvent = ({ event }: { event: PMCalendarEvent }) => (
    <div className="text-xs">
      <div className="font-medium truncate">{event.title}</div>
      <div className="text-xs opacity-75">
        {event.maintenance_type} • {event.status}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="flex-1">
        {/* Calendar Toolbar */}
        <div className="mb-4 flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setDate(new Date())}
              className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Today
            </button>
            {selectedEvents.length > 0 && (
              <button
                onClick={handleBulkGenerate}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                Generate {selectedEvents.length} Work Orders
              </button>
            )}
          </div>
          
          {/* Legend */}
          <div className="flex space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Waiting</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Generated</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Assigned</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Overdue</span>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="h-[600px] bg-white rounded-lg shadow p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            selectable
            resizable
            dragFromOutsideItem={() => null}
            eventPropGetter={eventStyleGetter}
            components={{
              event: CustomEvent
            }}
            step={60}
            showMultiDayTimes
            defaultDate={new Date()}
            views={['month', 'week', 'day', 'agenda']}
            popup
            popupOffset={{ x: 30, y: 20 }}
          />
        </div>
      </div>

      {/* Side Panel */}
      {selectedEvent && (
        <PMScheduleDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onGenerateWorkOrder={handleGenerateWorkOrder}
          onRefresh={refetch}
        />
      )}
    </div>
  );
}
