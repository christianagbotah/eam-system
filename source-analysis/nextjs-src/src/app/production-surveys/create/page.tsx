'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { productionSurveyService, ProductionSurvey } from '@/services/productionSurveyService';
import DashboardLayout from '@/components/DashboardLayout';
import EnterpriseForm from './EnterpriseForm';

export default function CreateSurveyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ProductionSurvey>({
    machine_id: 0,
    shift: 'Day',
    date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    downtime_minutes: 0,
    defects_count: 0,
    defect_types: [],
    units_produced: 0,
    cycles_completed: 0
  });
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState<any[]>([]);

  useEffect(() => {
    loadMachines();
  }, []);

  const loadMachines = async () => {
    try {
      const response = await fetch(`/api/v1/eam/machines`);
      const data = await response.json();
      if (data.status === 'success') {
        setMachines(data.data || []);
      }
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = true) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await productionSurveyService.create(formData);
      const surveyId = (response.data as any)?.id;

      if (!saveAsDraft) {
        await productionSurveyService.submit(surveyId);
      }

      alert('Survey created successfully');
      router.push('/production-surveys');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error creating survey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-base font-semibold mb-6">Create Production Survey</h1>

        <form onSubmit={(e) => handleSubmit(e, true)} className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-2">Machine *</label>
              <select
                required
                value={formData.machine_id || ''}
                onChange={(e) => setFormData({...formData, machine_id: parseInt(e.target.value)})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select Machine</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} - {machine.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Shift *</label>
              <select
                required
                value={formData.shift}
                onChange={(e) => setFormData({...formData, shift: e.target.value as 'Day' | 'Night'})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Assembly</label>
              <input
                type="number"
                value={formData.assembly_id || ''}
                onChange={(e) => setFormData({...formData, assembly_id: parseInt(e.target.value)})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Part</label>
              <input
                type="number"
                value={formData.part_id || ''}
                onChange={(e) => setFormData({...formData, part_id: parseInt(e.target.value)})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Work Order</label>
              <input
                type="number"
                value={formData.work_order_id || ''}
                onChange={(e) => setFormData({...formData, work_order_id: parseInt(e.target.value)})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Start Time *</label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Time *</label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Downtime (minutes)</label>
              <input
                type="number"
                min="0"
                value={formData.downtime_minutes}
                onChange={(e) => setFormData({...formData, downtime_minutes: parseInt(e.target.value)})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Defects Count</label>
              <input
                type="number"
                min="0"
                value={formData.defects_count}
                onChange={(e) => setFormData({...formData, defects_count: parseInt(e.target.value)})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Units Produced</label>
              <input
                type="number"
                min="0"
                value={formData.units_produced || 0}
                onChange={(e) => setFormData({...formData, units_produced: parseInt(e.target.value)})}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cycles Completed</label>
              <input
                type="number"
                min="0"
                value={formData.cycles_completed || 0}
                onChange={(e) => setFormData({...formData, cycles_completed: parseInt(e.target.value)})}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          {formData.downtime_minutes > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Downtime Reason *</label>
              <textarea
                required
                value={formData.downtime_reason || ''}
                onChange={(e) => setFormData({...formData, downtime_reason: e.target.value})}
                className="w-full border rounded px-3 py-2"
                rows={3}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Comments</label>
            <textarea
              value={formData.comments || ''}
              onChange={(e) => setFormData({...formData, comments: e.target.value})}
              className="w-full border rounded px-3 py-2"
              rows={4}
            />
          </div>

          <EnterpriseForm formData={formData} setFormData={setFormData} />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, false)}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-200 px-6 py-2 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
