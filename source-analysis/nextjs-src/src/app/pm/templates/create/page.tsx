'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { pmService } from '@/services/pmService';
import { toast } from 'react-hot-toast';
import PMTemplateForm from '@/components/pm/PMTemplateForm';

export default function CreatePMTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    try {
      setLoading(true);
      const response = await pmService.createTemplate(data);
      if (response.success) {
        toast.success('PM Template created successfully');
        router.push('/pm/templates');
      } else {
        toast.error(response.error || 'Failed to create template');
      }
    } catch (error) {
      toast.error('Failed to create PM template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-base font-semibold">Create PM Template</h1>
        <p className="text-gray-600">Create a new preventive maintenance template</p>
      </div>

      <PMTemplateForm
        onSubmit={handleSubmit}
        loading={loading}
        onCancel={() => router.push('/pm/templates')}
      />
    </div>
  );
}
