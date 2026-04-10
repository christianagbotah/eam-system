'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';

export default function ComprehensiveProductionSurvey() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [survey, setSurvey] = useState({
    work_center: '',
    code: '',
    survey_date: new Date().toISOString().split('T')[0],
    shift: 'Morning',
    units_per_day: '',
    no_of_hours_per_unit_shift: '',
    target_per_machine: '',
    total_time_available_mins: '',
    break_mins: '',
    repair_maint_mins: '',
    input_delivery_problems_mins: '',
    change_over_mins: '',
    startup_mins: '',
    cleaning_mins: '',
    others_mins: '',
    preventive_maint_mins: '',
    total_downtime_mins: '',
    productive_time_mins: '',
    production_morning: '',
    production_afternoon: '',
    production_night: '',
    total_production_yards: '',
    target_yards: '',
    utilization_actual: '',
    utilization_standard: '',
    speed_actual: '',
    speed_standard: '',
    productivity_percent: '',
    efficiency_percent: '',
    cumulative_production: '',
    operator_notes: '',
    quality_issues: ''
  });

  useEffect(() => {
    calculateFields();
  }, [
    survey.total_time_available_mins,
    survey.break_mins,
    survey.repair_maint_mins,
    survey.input_delivery_problems_mins,
    survey.change_over_mins,
    survey.startup_mins,
    survey.cleaning_mins,
    survey.others_mins,
    survey.preventive_maint_mins,
    survey.production_morning,
    survey.production_afternoon,
    survey.production_night,
    survey.productive_time_mins
  ]);

  const calculateFields = () => {
    const totalDowntime = 
      parseFloat(survey.break_mins || '0') +
      parseFloat(survey.repair_maint_mins || '0') +
      parseFloat(survey.input_delivery_problems_mins || '0') +
      parseFloat(survey.change_over_mins || '0') +
      parseFloat(survey.startup_mins || '0') +
      parseFloat(survey.cleaning_mins || '0') +
      parseFloat(survey.others_mins || '0') +
      parseFloat(survey.preventive_maint_mins || '0');

    const productiveTime = parseFloat(survey.total_time_available_mins || '0') - totalDowntime;

    const totalProduction = 
      parseFloat(survey.production_morning || '0') +
      parseFloat(survey.production_afternoon || '0') +
      parseFloat(survey.production_night || '0');

    const utilizationActual = survey.total_time_available_mins 
      ? ((productiveTime / parseFloat(survey.total_time_available_mins)) * 100).toFixed(2)
      : '0';

    const speedActual = productiveTime > 0
      ? (totalProduction / productiveTime).toFixed(2)
      : '0';

    const productivity = survey.total_time_available_mins
      ? ((totalProduction / parseFloat(survey.total_time_available_mins)) * 100).toFixed(2)
      : '0';

    const efficiency = survey.total_time_available_mins
      ? ((productiveTime / parseFloat(survey.total_time_available_mins)) * 100).toFixed(2)
      : '0';

    setSurvey(prev => ({
      ...prev,
      total_downtime_mins: totalDowntime.toString(),
      productive_time_mins: productiveTime.toString(),
      total_production_yards: totalProduction.toString(),
      utilization_actual: utilizationActual,
      speed_actual: speedActual,
      productivity_percent: productivity,
      efficiency_percent: efficiency
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = showToast.loading('Submitting comprehensive survey...');

    try {
      await api.post('/production-surveys/comprehensive', survey);
      showToast.dismiss(loadingToast);
      showToast.success('Comprehensive production survey submitted successfully!');
      router.push('/admin/production-survey');
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to submit survey');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-2xl shadow-xl border border-white/20 p-6">
          <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Comprehensive Production Survey
          </h1>
          <p className="text-slate-600 mt-1">Complete daily production data sheet with all metrics</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Work Center <span className="text-red-500">*</span></label>
                <input type="text" value={survey.work_center} onChange={(e) => setSurvey({...survey, work_center: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" placeholder="e.g., SINGEING M/C" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Code <span className="text-red-500">*</span></label>
                <input type="text" value={survey.code} onChange={(e) => setSurvey({...survey, code: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" placeholder="e.g., 312/1" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Survey Date <span className="text-red-500">*</span></label>
                <input type="date" value={survey.survey_date} onChange={(e) => setSurvey({...survey, survey_date: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Shift <span className="text-red-500">*</span></label>
                <select value={survey.shift} onChange={(e) => setSurvey({...survey, shift: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" required>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Night">Night</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Units Per Day</label>
                <input type="number" value={survey.units_per_day} onChange={(e) => setSurvey({...survey, units_per_day: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Hours Per Unit Shift</label>
                <input type="number" step="0.1" value={survey.no_of_hours_per_unit_shift} onChange={(e) => setSurvey({...survey, no_of_hours_per_unit_shift: e.target.value})} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-xl border-2 border-green-200 p-6">
            <h2 className="text-xl font-bold text-green-900 mb-4">Time Available (A)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Total Time Available (mins) <span className="text-red-500">*</span></label>
                <input type="number" value={survey.total_time_available_mins} onChange={(e) => setSurvey({...survey, total_time_available_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" placeholder="e.g., 480" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target Per Machine</label>
                <input type="number" value={survey.target_per_machine} onChange={(e) => setSurvey({...survey, target_per_machine: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none" />
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl shadow-xl border-2 border-orange-200 p-6">
            <h2 className="text-xl font-bold text-orange-900 mb-4">Stoppages (B) - Minutes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Break</label>
                <input type="number" value={survey.break_mins} onChange={(e) => setSurvey({...survey, break_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Repair/Maint.</label>
                <input type="number" value={survey.repair_maint_mins} onChange={(e) => setSurvey({...survey, repair_maint_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Input/Delivery</label>
                <input type="number" value={survey.input_delivery_problems_mins} onChange={(e) => setSurvey({...survey, input_delivery_problems_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Change Over</label>
                <input type="number" value={survey.change_over_mins} onChange={(e) => setSurvey({...survey, change_over_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Start-up</label>
                <input type="number" value={survey.startup_mins} onChange={(e) => setSurvey({...survey, startup_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Cleaning</label>
                <input type="number" value={survey.cleaning_mins} onChange={(e) => setSurvey({...survey, cleaning_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Others</label>
                <input type="number" value={survey.others_mins} onChange={(e) => setSurvey({...survey, others_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Preventive Maint.</label>
                <input type="number" value={survey.preventive_maint_mins} onChange={(e) => setSurvey({...survey, preventive_maint_mins: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" />
              </div>
            </div>
            <div className="mt-4 p-4 bg-white rounded-xl border-2 border-orange-300">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Downtime (B):</span>
                <span className="text-base font-semibold text-orange-600">{survey.total_downtime_mins || '0'} mins</span>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl shadow-xl border-2 border-blue-200 p-6">
            <h2 className="text-xl font-bold text-blue-900 mb-4">Productive Time (C = A - B)</h2>
            <div className="p-4 bg-white rounded-xl border-2 border-blue-300">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Productive Time:</span>
                <span className="text-lg font-semibold text-blue-600">{survey.productive_time_mins || '0'} mins</span>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl shadow-xl border-2 border-purple-200 p-6">
            <h2 className="text-xl font-bold text-purple-900 mb-4">Production (Yards)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Morning</label>
                <input type="number" value={survey.production_morning} onChange={(e) => setSurvey({...survey, production_morning: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Afternoon</label>
                <input type="number" value={survey.production_afternoon} onChange={(e) => setSurvey({...survey, production_afternoon: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Night</label>
                <input type="number" value={survey.production_night} onChange={(e) => setSurvey({...survey, production_night: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Target (Yards)</label>
                <input type="number" value={survey.target_yards} onChange={(e) => setSurvey({...survey, target_yards: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none" />
              </div>
            </div>
            <div className="mt-4 p-4 bg-white rounded-xl border-2 border-purple-300">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Production (D):</span>
                <span className="text-base font-semibold text-purple-600">{survey.total_production_yards || '0'} yards</span>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl shadow-xl border-2 border-indigo-200 p-6">
            <h2 className="text-xl font-bold text-indigo-900 mb-4">Calculated Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
                <p className="text-sm text-slate-600 mb-1">Utilization % (F=C/A)</p>
                <p className="text-base font-semibold text-indigo-600">{survey.utilization_actual || '0'}%</p>
              </div>
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
                <p className="text-sm text-slate-600 mb-1">Speed (H=D/C)</p>
                <p className="text-base font-semibold text-indigo-600">{survey.speed_actual || '0'} yds/min</p>
              </div>
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
                <p className="text-sm text-slate-600 mb-1">Productivity (I=D/A)</p>
                <p className="text-base font-semibold text-indigo-600">{survey.productivity_percent || '0'}%</p>
              </div>
              <div className="p-4 bg-white rounded-xl border-2 border-indigo-200">
                <p className="text-sm text-slate-600 mb-1">Efficiency (K)</p>
                <p className="text-base font-semibold text-indigo-600">{survey.efficiency_percent || '0'}%</p>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Additional Notes</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Quality Issues</label>
                <textarea value={survey.quality_issues} onChange={(e) => setSurvey({...survey, quality_issues: e.target.value})} rows={3} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" placeholder="Describe any quality issues..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Operator Notes</label>
                <textarea value={survey.operator_notes} onChange={(e) => setSurvey({...survey, operator_notes: e.target.value})} rows={3} className="w-full px-4 py-3 bg-white/50 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" placeholder="Any additional notes..."></textarea>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/80 rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => router.back()} className="px-3 py-1.5 text-sm border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-all font-medium">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-medium disabled:opacity-50">
                {loading ? 'Submitting...' : 'Submit Comprehensive Survey'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
