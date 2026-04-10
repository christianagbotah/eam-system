'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface WorkOrder {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  asset_name: string;
  due_date: string;
}

export default function MobileWorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchWorkOrder();
  }, []);

  const fetchWorkOrder = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/v1/eam/work-orders/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      setWo(data.data);
    } catch (error) {
      toast.error('Failed to load work order');
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      const token = localStorage.getItem('access_token');
      await api.put(`/work-orders/${params.id}`)`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, notes })
      });
      toast.success('Status updated');
      router.push('/mobile/work-orders');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (!wo) return <div className="p-4">Loading...</div>;

  return (
    <div className="p-4 space-y-4">
      <button onClick={() => router.back()} className="text-blue-600">← Back</button>
      
      <div className="bg-white rounded-lg shadow p-4">
        <h1 className="text-xl font-bold mb-2">{wo.title}</h1>
        <p className="text-gray-600 mb-4">{wo.description}</p>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Asset:</span>
            <p className="font-semibold">{wo.asset_name}</p>
          </div>
          <div>
            <span className="text-gray-500">Priority:</span>
            <p className="font-semibold capitalize">{wo.priority}</p>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <p className="font-semibold capitalize">{wo.status}</p>
          </div>
          <div>
            <span className="text-gray-500">Due Date:</span>
            <p className="font-semibold">{formatDate(wo.due_date)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-bold mb-3">Add Notes</h2>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Enter work notes..."
          className="w-full border rounded p-2 mb-3"
          rows={4}
        />
        
        <h2 className="font-bold mb-3">Attach Photo</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-gray-100 border-2 border-dashed rounded-lg p-4 text-center"
        >
          {photo ? '📷 Photo Captured' : '📸 Take Photo'}
        </button>
        {photo && <img src={photo} alt="Captured" className="mt-3 rounded-lg w-full" />}
      </div>

      <div className="space-y-2">
        {wo.status === 'assigned' && (
          <button onClick={() => updateStatus('in_progress')} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold">
            Start Work
          </button>
        )}
        {wo.status === 'in_progress' && (
          <button onClick={() => updateStatus('completed')} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold">
            Complete Work Order
          </button>
        )}
      </div>
    </div>
  );
}
