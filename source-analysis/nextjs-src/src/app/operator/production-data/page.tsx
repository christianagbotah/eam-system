'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';

export default function OperatorProductionData() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<any>(null);
  const [shift, setShift] = useState('Morning');

  const [data, setData] = useState({
    target_id: '',
    shift: 'Morning',
    break_mins: '',
    repair_maint_mins: '',
    input_delivery_mins: '',
    change_over_mins: '',
    startup_mins: '',
    cleaning_mins: '',
    others_mins: '',
    preventive_maint_mins: '',
    production_yards: ''
  });

  const [calculated, setCalculated] = useState({
    total_downtime: 0,
    productive_time: 0,
    utilization_actual: 0,
    speed_actual: 0,
    productivity: 0,
    efficiency: 0
  });

  useEffect(() => {
    loadTarget();
  }, []);

  useEffect(() => {
    calculate();
  }, [data, target]);

  const loadTarget = async () => {
    try {
      const res = await api.get('/production-targets/my-target').catch(() => ({
        data: { data: { id: 1, work_center: 'SINGEING M/C', code: '312/1', total_time_available_mins: 480, utilization_standard_percent: 85, speed_standard_yds_per_min: 50 } }
      }));
      setTarget((res.data as any)?.data);
      setData(prev => ({ ...prev, target_id: (res.data as any)?.data.id }));
    } catch (error) {
      console.error('Error loading target:', error);
    }
  };

  const calculate = () => {
    if (!target) return;

    const totalDowntime = 
      parseFloat(data.break_mins || '0') +
      parseFloat(data.repair_maint_mins || '0') +
      parseFloat(data.input_delivery_mins || '0') +
      parseFloat(data.change_over_mins || '0') +
      parseFloat(data.startup_mins || '0') +
      parseFloat(data.cleaning_mins || '0') +
      parseFloat(data.others_mins || '0') +
      parseFloat(data.preventive_maint_mins || '0');

    const productiveTime = target.total_time_available_mins - totalDowntime;
    const production = parseFloat(data.production_yards || '0');
    
    const utilizationActual = target.total_time_available_mins > 0 
      ? (productiveTime / target.total_time_available_mins) * 100 
      : 0;
    
    const speedActual = productiveTime > 0 ? production / productiveTime : 0;
    const productivity = target.total_time_available_mins > 0 ? (production / target.total_time_available_mins) * 100 : 0;
    const efficiency = target.total_time_available_mins > 0 ? (productiveTime / target.total_time_available_mins) * 100 : 0;

    setCalculated({
      total_downtime: totalDowntime,
      productive_time: productiveTime,
      utilization_actual: utilizationActual,
      speed_actual: speedActual,
      productivity: productivity,
      efficiency: efficiency
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = showToast.loading('Submitting production data...');

    try {
      await api.post('/production-data/operator', { ...data, ...calculated });
      showToast.dismiss(loadingToast);
      showToast.success('Production data submitted successfully!');
      router.push('/operator');
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to submit data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <h1 className="text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Production Data Entry (Operator)
          </h1>
          <p className="text-slate-600 mt-1">Enter stoppages and production for your shift</p>
        </div>

        {target && (
          <div className="mb-6 backdrop-blur-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl border-2 border-blue-300 p-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-sm text-slate-600 mb-1">Work Center</p>
                <p className="font-bold text-slate-900">{target.work_center}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Code</p>
                <p className="font-bold text-slate-900">{target.code}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Available Time</p>
                <p className="font-bold text-slate-900">{target.total_time_available_mins} mins</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Standard Speed</p>
                <p className="font-bold text-slate-900">{target.speed_standard_yds_per_min} yds/min</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Shift Selection</h2>
            <select value={data.shift} onChange={(e) => setData({...data, shift: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" required>
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Night">Night</option>
            </select>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl shadow-xl border-2 border-orange-200 p-6">
            <h2 className="text-xl font-bold text-orange-900 mb-4">Stoppages (Columns H-N) - Minutes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Break (H)</label>
                <input type="number" value={data.break_mins} onChange={(e) => setData({...data, break_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Repair/Maint (I)</label>
                <input type="number" value={data.repair_maint_mins} onChange={(e) => setData({...data, repair_maint_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Input/Delivery (J)</label>
                <input type="number" value={data.input_delivery_mins} onChange={(e) => setData({...data, input_delivery_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Change Over (K)</label>
                <input type="number" value={data.change_over_mins} onChange={(e) => setData({...data, change_over_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Start-up (L)</label>
                <input type="number" value={data.startup_mins} onChange={(e) => setData({...data, startup_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Cleaning (M)</label>
                <input type="number" value={data.cleaning_mins} onChange={(e) => setData({...data, cleaning_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Others (N)</label>
                <input type="number" value={data.others_mins} onChange={(e) => setData({...data, others_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Preventive Maint (G)</label>
                <input type="number" value={data.preventive_maint_mins} onChange={(e) => setData({...data, preventive_maint_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
            </div>
            <div className="mt-4 p-4 bg-white rounded-xl border-2 border-orange-300">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Downtime (O - Auto):</span>
                <span className="text-base font-semibold text-orange-600">{calculated.total_downtime.toFixed(0)} mins</span>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-xl border-2 border-blue-200 p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4">Productive Time (C = A - B - Auto)</h2>
            <div className="p-4 bg-white rounded-xl border-2 border-blue-300">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Productive Time:</span>
                <span className="text-lg font-semibold text-blue-600">{calculated.productive_time.toFixed(0)} mins</span>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-xl border-2 border-purple-200 p-6">
            <h2 className="text-xl font-bold text-purple-900 mb-4">Production (Your Shift)</h2>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Production (Yards) <span className="text-red-500">*</span></label>
              <input type="number" value={data.production_yards} onChange={(e) => setData({...data, production_yards: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none" placeholder="Enter production in yards" required />
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl shadow-xl border-2 border-indigo-200 p-6">
            <h2 className="text-xl font-bold text-indigo-900 mb-4">Auto-Calculated Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
                <p className="text-sm text-slate-600 mb-1">Utilization (F=C/A)</p>
                <p className="text-base font-semibold text-indigo-600">{calculated.utilization_actual.toFixed(2)}%</p>
                <p className="text-xs text-slate-500 mt-1">Std: {target?.utilization_standard_percent}%</p>
              </div>
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
                <p className="text-sm text-slate-600 mb-1">Speed (H=D/C)</p>
                <p className="text-base font-semibold text-indigo-600">{calculated.speed_actual.toFixed(2)} yds/min</p>
                <p className="text-xs text-slate-500 mt-1">Std: {target?.speed_standard_yds_per_min} yds/min</p>
              </div>
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
                <p className="text-sm text-slate-600 mb-1">Productivity (I=D/A)</p>
                <p className="text-base font-semibold text-indigo-600">{calculated.productivity.toFixed(2)}%</p>
              </div>
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
                <p className="text-sm text-slate-600 mb-1">Efficiency (K)</p>
                <p className="text-base font-semibold text-indigo-600">{calculated.efficiency.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => router.back()} className="px-3 py-1.5 text-sm border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium">Cancel</button>
              <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium disabled:opacity-50">{loading ? 'Submitting...' : 'Submit Production Data'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
