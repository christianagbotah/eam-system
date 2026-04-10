import { useState } from 'react';
import { workOrderService } from '@/services/workOrderService';
import { PMChecklistItem } from './usePmTasks';

export interface CompletionData {
  checklist_items: Array<{
    id: number;
    value: any;
    photo_url?: string;
  }>;
  notes?: string;
  actual_hours?: number;
}

export const useCompletePmTask = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    
    // This would be implemented in your API
    const response = await fetch('/api/v1/uploads/photos', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload photo');
    }
    
    const result = await response.json();
    return result.data.url;
  };

  const completeTask = async (taskId: number, completionData: CompletionData) => {
    try {
      setLoading(true);
      setError(null);

      // Upload any photos first
      const processedItems = await Promise.all(
        completionData.checklist_items.map(async (item) => {
          if (item.photo_url && item.photo_url.startsWith('blob:')) {
            // Convert blob URL to file and upload
            const response = await fetch(item.photo_url);
            const blob = await response.blob();
            const file = new File([blob], `checklist_${item.id}.jpg`, { type: 'image/jpeg' });
            const uploadedUrl = await uploadPhoto(file);
            return { ...item, photo_url: uploadedUrl };
          }
          return item;
        })
      );

      const payload = {
        ...completionData,
        checklist_items: processedItems,
        actual_end: new Date().toISOString(),
        status: 'completed'
      };

      const response = await workOrderService.complete(taskId, payload);
      return response;
    } catch (err) {
      setError('Failed to complete task');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    completeTask,
    uploadPhoto,
    loading,
    error
  };
};
