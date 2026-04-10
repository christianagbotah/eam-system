'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import AssemblyForm from '@/components/forms/AssemblyForm';
import api from '@/lib/api';

export default function CreateAssemblyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      const response = await api.post('/assemblies', formData);

      const result = response.data;

      if (response.ok && result.status === 'success') {
        toast.success('Assembly created successfully!');
        router.push('/assembly/assemblyLists');
      } else {
        toast.error(result.message || 'Failed to create assembly');
      }
    } catch (error) {
      toast.error('Error creating assembly');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-800">Add New Assembly</h1>
        <p className="text-gray-600 mt-2">Create assembly for machine hierarchy</p>
      </div>
      <AssemblyForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
