'use client';

import { useState, useEffect } from 'react';
import { productionSurveyService } from '@/services/productionSurveyService';
import DashboardLayout from '@/components/DashboardLayout';

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [pmTriggers, setPmTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const kpisRes = await productionSurveyService.getKPIs({});
      setKpis(kpisRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">Production Analytics</h1>

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Total Runtime</div>
                <div className="text-lg font-semibold mt-2">{kpis?.total_runtime || 0}</div>
                <div className="text-xs text-gray-500 mt-1">minutes</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Total Downtime</div>
                <div className="text-lg font-semibold mt-2 text-red-600">{kpis?.total_downtime || 0}</div>
                <div className="text-xs text-gray-500 mt-1">minutes</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">OEE Availability</div>
                <div className="text-lg font-semibold mt-2 text-green-600">{kpis?.oee_availability || 0}%</div>
                <div className="text-xs text-gray-500 mt-1">efficiency</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-sm text-gray-600">Defect Rate</div>
                <div className="text-lg font-semibold mt-2 text-orange-600">{kpis?.defect_rate || 0}</div>
                <div className="text-xs text-gray-500 mt-1">per survey</div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Usage-Based PM Triggers</h2>
              <div className="text-sm text-gray-600 mb-4">
                Monitors production usage to automatically trigger preventive maintenance tasks
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">PM triggers are automatically checked when surveys are approved</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-4">Performance Trends</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Runtime Efficiency</span>
                    <span className="font-semibold">{kpis?.oee_availability || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full" 
                      style={{width: `${kpis?.oee_availability || 0}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Downtime Impact</span>
                    <span className="font-semibold text-red-600">
                      {kpis ? Math.round((kpis.total_downtime / (kpis.total_runtime + kpis.total_downtime)) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-red-500 h-3 rounded-full" 
                      style={{width: `${kpis ? Math.round((kpis.total_downtime / (kpis.total_runtime + kpis.total_downtime)) * 100) : 0}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
