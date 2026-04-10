'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import PartForm from '@/components/forms/PartForm';
import api from '@/lib/api';

export default function CreatePartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      const response = await api.post('/parts', formData);

      const result = response.data;

      if (response.ok && result.status === 'success') {
        toast.success('Part created successfully!');
        router.push('/parts/partLists');
      } else {
        toast.error(result.message || 'Failed to create part');
      }
    } catch (error) {
      toast.error('Error creating part');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-800">Add New Part / Component</h1>
        <p className="text-gray-600 mt-2">Create part with complete specifications and hierarchy</p>
      </div>
      <PartForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
