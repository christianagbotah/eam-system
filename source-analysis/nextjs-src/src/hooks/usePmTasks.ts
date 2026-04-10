import { useState, useEffect } from 'react';
import { workOrderService } from '@/services/workOrderService';

export interface PMTask {
  id: number;
  wo_number: string;
  title: string;
  description: string;
  asset_name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'assigned' | 'in_progress' | 'completed';
  estimated_hours: number;
  pm_schedule_id: number;
  checklist?: PMChecklistItem[];
  next_due_date?: string;
  remaining_life?: number;
}

export interface PMChecklistItem {
  id: number;
  item_text: string;
  item_type: 'yesno' | 'passfail' | 'numeric' | 'text' | 'photo';
  required: boolean;
  sequence: number;
  value?: any;
  photo_url?: string;
}

export const usePmTasks = (technicianId?: number) => {
  const [tasks, setTasks] = useState<PMTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await workOrderService.getPmTasks(technicianId);
      setTasks(response || []);
    } catch (err) {
      setError('Failed to load PM tasks');
      console.error('Error loading PM tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const startTask = async (taskId: number) => {
    try {
      const response = await workOrderService.update(taskId, { 
        status: 'in_progress',
        actual_start: new Date().toISOString()
      });
      
      // Update local state optimistically
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'in_progress' as const }
          : task
      ));
      
      return response;
    } catch (err) {
      setError('Failed to start task');
      throw err;
    }
  };

  useEffect(() => {
    loadTasks();
  }, [technicianId]);

  return {
    tasks,
    loading,
    error,
    refetch: loadTasks,
    startTask
  };
};
