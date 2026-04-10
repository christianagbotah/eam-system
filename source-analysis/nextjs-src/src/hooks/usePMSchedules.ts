import { useState, useEffect } from 'react';
import { pmService, PMSchedule } from '@/services/pmService';

export interface PMCalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  asset_id?: number;
  pm_schedule_id: number;
  status: string;
  assigned_to?: string;
  priority: string;
  maintenance_type: string;
  resource?: {
    id: number;
    title: string;
  };
}

interface Filters {
  facility?: string;
  asset_type?: string;
  status?: string;
  from?: string;
  to?: string;
}

export const usePMSchedules = (filters: Filters = {}) => {
  const [events, setEvents] = useState<PMCalendarEvent[]>([]);
  const [schedules, setSchedules] = useState<PMSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await pmService.listSchedules(filters);
      if (response.success) {
        const schedulesData = response.data;
        setSchedules(schedulesData);
        
        // Transform schedules to calendar events
        const calendarEvents: PMCalendarEvent[] = schedulesData
          .filter((schedule: PMSchedule) => schedule.next_due_date)
          .map((schedule: PMSchedule) => {
            const startDate = new Date(schedule.next_due_date!);
            const endDate = new Date(startDate);
            endDate.setHours(startDate.getHours() + 2); // Default 2-hour duration
            
            return {
              id: schedule.id,
              title: schedule.title,
              start: startDate,
              end: endDate,
              asset_id: schedule.asset_id,
              pm_schedule_id: schedule.id,
              status: schedule.status,
              assigned_to: schedule.assigned_to,
              priority: schedule.priority,
              maintenance_type: schedule.maintenance_type,
              resource: schedule.asset_id ? {
                id: schedule.asset_id,
                title: `Asset ${schedule.asset_id}`
              } : undefined
            };
          });
        
        setEvents(calendarEvents);
      } else {
        setError(response.error || 'Failed to load schedules');
      }
    } catch (err) {
      setError('Failed to load PM schedules');
      console.error('Error loading PM schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateScheduleDate = async (scheduleId: number, newDate: Date) => {
    try {
      const response = await pmService.updateSchedule(scheduleId, {
        next_due_date: newDate.toISOString().split('T')[0],
        comment: 'Rescheduled via calendar drag-and-drop'
      });
      
      if (response.success) {
        // Update local state
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event.pm_schedule_id === scheduleId 
              ? { 
                  ...event, 
                  start: newDate, 
                  end: new Date(newDate.getTime() + 2 * 60 * 60 * 1000) // +2 hours
                }
              : event
          )
        );
        return true;
      } else {
        setError(response.error || 'Failed to update schedule');
        return false;
      }
    } catch (err) {
      setError('Failed to update schedule');
      console.error('Error updating schedule:', err);
      return false;
    }
  };

  const generateWorkOrder = async (scheduleId: number) => {
    try {
      const response = await pmService.generateWorkOrder(scheduleId);
      if (response.success) {
        // Refresh schedules to get updated status
        await loadSchedules();
        return response.data;
      } else {
        setError(response.error || 'Failed to generate work order');
        return null;
      }
    } catch (err) {
      setError('Failed to generate work order');
      console.error('Error generating work order:', err);
      return null;
    }
  };

  const bulkGenerateWorkOrders = async (templateIds: number[]) => {
    try {
      // Note: This endpoint needs to be implemented in the backend
      const response = await pmService.bulkGenerateWorkOrders?.(templateIds);
      if (response?.success) {
        await loadSchedules();
        return response.data;
      } else {
        setError('Bulk generation not implemented');
        return null;
      }
    } catch (err) {
      setError('Failed to bulk generate work orders');
      console.error('Error bulk generating work orders:', err);
      return null;
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [JSON.stringify(filters)]);

  return {
    events,
    schedules,
    loading,
    error,
    refetch: loadSchedules,
    updateScheduleDate,
    generateWorkOrder,
    bulkGenerateWorkOrders
  };
};
