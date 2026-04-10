'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MachineForm from '@/components/forms/MachineForm';
import AlertModal from '@/components/AlertModal';
import api from '@/lib/api';

export default function CreateMachinePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ show: boolean; type: 'success' | 'error'; title: string; message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      const response = await api.post('/assets/machines', formData);

      const result = response.data;

      if (response.ok && result.status === 'success') {
        setAlert({
          show: true,
          type: 'success',
          title: 'Success',
          message: 'Machine created successfully!'
        });
        setTimeout(() => router.push('/machine/machineLists'), 1500);
      } else {
        setAlert({
          show: true,
          type: 'error',
          title: 'Error',
          message: result.message || 'Failed to create machine. Please try again.'
        });
      }
    } catch (error) {
      setAlert({
        show: true,
        type: 'error',
        title: 'Error',
        message: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-800">Add New Machine</h1>
          <p className="text-gray-600 mt-2">Complete machine information and technical specifications</p>
        </div>
        <MachineForm onSubmit={handleSubmit} loading={loading} />
      </div>
      <AlertModal
        isOpen={alert.show}
        onClose={() => setAlert({ ...alert, show: false })}
        title={alert.title}
        message={alert.message}
        type={alert.type}
      />
    </>
  );
}
