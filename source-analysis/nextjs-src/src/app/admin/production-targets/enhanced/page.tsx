'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';

export default function EnhancedProductionTarget() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [workCenters, setWorkCenters] = useState<any[]>([]);

  const [target, setTarget] = useState({
    work_center: '',
    code: '',
    target_date: new Date().toISOString().split('T')[0],
    units_per_day: '',
    hours_per_unit_shift: '',
    target_per_machine: '',
    total_time_available_mins: '480',
    utilization_standard_percent: '85',
    speed_standard_yds_per_min: '50'
  });

  useEffect(() => {
    loadWorkCenters();
  }, []);

  const loadWorkCenters = async () => {
    try {
      const res = await api.get('/work-centers').catch(() => ({ data: { data: [] } }));
      setWorkCenters((res.data as any)?.data || []);
    } catch (error) {
      console.error('Error loading work centers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = showToast.loading('Setting production target...');

    try {
      await api.post('/production-targets', target);
      showToast.dismiss(loadingToast);
      showToast.success('Production target set successfully!');
      router.push('/admin/production-targets');
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to set target');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <h1 className="text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Set Production Target
          </h1>
          <p className="text-slate-600 mt-1">Configure daily production parameters (Planner/Supervisor)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Machine & Date</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Work Center <span className="text-red-500">*</span></label>
                <select value={target.work_center} onChange={(e) => setTarget({...target, work_center: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none" required>
                  <option value="">Select Work Center</option>
                  {workCenters.map(wc => <option key={wc.id} value={wc.name}>{wc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Code <span className="text-red-500">*</span></label>
                <input type="text" value={target.code} onChange={(e) => setTarget({...target, code: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none" placeholder="e.g., 312/1" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Date <span className="text-red-500">*</span></label>
                <input type="date" value={target.target_date} onChange={(e) => setTarget({...target, target_date: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none" required />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-xl border-2 border-green-200 p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">Shift Configuration (Columns D, E, F)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Units Per Day (D) <span className="text-red-500">*</span></label>
                <input type="number" value={target.units_per_day} onChange={(e) => setTarget({...target, units_per_day: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Hours Per Unit Shift (E) <span className="text-red-500">*</span></label>
                <input type="number" step="0.1" value={target.hours_per_unit_shift} onChange={(e) => setTarget({...target, hours_per_unit_shift: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Per Machine (F) <span className="text-red-500">*</span></label>
                <input type="number" value={target.target_per_machine} onChange={(e) => setTarget({...target, target_per_machine: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" required />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-xl border-2 border-blue-200 p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4">Time Available (Column A)</h2>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Total Time Available (mins) <span className="text-red-500">*</span></label>
              <input type="number" value={target.total_time_available_mins} onChange={(e) => setTarget({...target, total_time_available_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" required />
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl shadow-xl border-2 border-indigo-200 p-6">
            <h2 className="text-xl font-bold text-indigo-900 mb-4">Standards (Table 2)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Utilization Standard (%) <span className="text-red-500">*</span></label>
                <input type="number" step="0.1" value={target.utilization_standard_percent} onChange={(e) => setTarget({...target, utilization_standard_percent: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Speed Standard (yds/min) <span className="text-red-500">*</span></label>
                <input type="number" step="0.1" value={target.speed_standard_yds_per_min} onChange={(e) => setTarget({...target, speed_standard_yds_per_min: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" required />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => router.back()} className="px-3 py-1.5 text-sm border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium">Cancel</button>
              <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium disabled:opacity-50">{loading ? 'Setting...' : 'Set Target'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
