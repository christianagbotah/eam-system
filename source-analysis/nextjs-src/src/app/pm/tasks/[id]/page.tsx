'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { workOrderService } from '@/services/workOrderService';
import { useCompletePmTask } from '@/hooks/useCompletePmTask';
import { PMTask, PMChecklistItem } from '@/hooks/usePmTasks';
import PMStatusWidget from '@/components/pm/PMStatusWidget';
import PMTaskStatusWidget from '@/components/pm/PMTaskStatusWidget';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import PhotoCapture from '@/components/pm/PhotoCapture';

export default function PMTaskExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = parseInt(params.id as string);
  
  const [task, setTask] = useState<PMTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklistData, setChecklistData] = useState<Record<number, any>>({});
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState('');
  const [actualHours, setActualHours] = useState<number>(0);
  
  const { completeTask, loading: completing, error } = useCompletePmTask();

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    try {
      const response = await workOrderService.getTaskWithChecklist(taskId);
      setTask(response);
      
      // Initialize checklist data
      if (response.checklist) {
        const initialData: Record<number, any> = {};
        response.checklist.forEach((item: PMChecklistItem) => {
          initialData[item.id] = item.item_type === 'yesno' ? null : '';
        });
        setChecklistData(initialData);
      }
    } catch (err) {
      console.error('Failed to load task:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistChange = (itemId: number, value: any) => {
    setChecklistData(prev => ({ ...prev, [itemId]: value }));
  };

  const handlePhotoCapture = (itemId: number, file: File) => {
    const url = URL.createObjectURL(file);
    setPhotos(prev => ({ ...prev, [itemId]: url }));
  };

  const handleStartTask = async () => {
    try {
      await workOrderService.update(taskId, { 
        status: 'in_progress',
        actual_start: new Date().toISOString()
      });
      setTask(prev => prev ? { ...prev, status: 'in_progress' } : null);
    } catch (err) {
      console.error('Failed to start task:', err);
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;

    // Validate required fields
    const requiredItems = task.checklist?.filter(item => item.required) || [];
    const missingItems = requiredItems.filter(item => 
      !checklistData[item.id] || 
      (item.item_type === 'photo' && !photos[item.id])
    );

    if (missingItems.length > 0) {
      alert(`Please complete all required checklist items: ${missingItems.map(i => i.item_text).join(', ')}`);
      return;
    }

    try {
      const completionData = {
        checklist_items: Object.entries(checklistData).map(([itemId, value]) => ({
          id: parseInt(itemId),
          value,
          photo_url: photos[parseInt(itemId)]
        })),
        notes,
        actual_hours: actualHours
      };

      await completeTask(taskId, completionData);
      router.push('/pm/tasks');
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const renderChecklistItem = (item: PMChecklistItem) => {
    const value = checklistData[item.id];
    
    switch (item.item_type) {
      case 'yesno':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={`item_${item.id}`}
                value="yes"
                checked={value === 'yes'}
                onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                className="mr-2"
              />
              Yes
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`item_${item.id}`}
                value="no"
                checked={value === 'no'}
                onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                className="mr-2"
              />
              No
            </label>
          </div>
        );
      
      case 'passfail':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={`item_${item.id}`}
                value="pass"
                checked={value === 'pass'}
                onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                className="mr-2"
              />
              Pass
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`item_${item.id}`}
                value="fail"
                checked={value === 'fail'}
                onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                className="mr-2"
              />
              Fail
            </label>
          </div>
        );
      
      case 'numeric':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleChecklistChange(item.id, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Enter numeric value"
          />
        );
      
      case 'text':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleChecklistChange(item.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
            placeholder="Enter text"
          />
        );
      
      case 'photo':
        return (
          <PhotoCapture
            onPhotoCapture={(file) => handlePhotoCapture(item.id, file)}
            currentPhoto={photos[item.id]}
            required={item.required}
          />
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">Task not found</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
        <div className="flex space-x-2">
          <Badge className={task.priority === 'critical' ? 'bg-red-100 text-red-800' : 
                           task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                           'bg-yellow-100 text-yellow-800'}>
            {task.priority}
          </Badge>
          <Badge className={task.status === 'in_progress' ? 'bg-green-100 text-green-800' : 
                           'bg-blue-100 text-blue-800'}>
            {task.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Task Info */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Task Details</h3>
            <div className="space-y-1 text-sm">
              <div><span className="font-medium">WO Number:</span> {task.wo_number}</div>
              <div><span className="font-medium">Asset:</span> {task.asset_name}</div>
              <div><span className="font-medium">Estimated Hours:</span> {task.estimated_hours}</div>
            </div>
          </div>
          
          {(task.next_due_date || task.remaining_life) && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">PM Status</h3>
              <PMTaskStatusWidget
                remainingLife={task.remaining_life || 0}
                nextDueDate={task.next_due_date}
                assetName={task.asset_name}
                maintenanceType="Preventive Maintenance"
              />
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <p className="text-gray-700">{task.description}</p>
        </div>
      </Card>

      {/* Checklist */}
      {task.checklist && task.checklist.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Checklist</h3>
          <div className="space-y-6">
            {task.checklist
              .sort((a, b) => a.sequence - b.sequence)
              .map((item) => (
                <div key={item.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {item.sequence}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium text-gray-900">{item.item_text}</h4>
                        {item.required && (
                          <span className="text-red-500 text-sm">*</span>
                        )}
                      </div>
                      {renderChecklistItem(item)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Completion Form */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actual Hours Worked
            </label>
            <input
              type="number"
              step="0.5"
              value={actualHours}
              onChange={(e) => setActualHours(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="0.0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Add any additional notes..."
            />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
        >
          Back
        </button>
        
        <div className="flex space-x-3">
          {task.status === 'assigned' && (
            <button
              onClick={handleStartTask}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Start Task
            </button>
          )}
          
          {task.status === 'in_progress' && (
            <button
              onClick={handleCompleteTask}
              disabled={completing}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {completing ? 'Completing...' : 'Complete Task'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}