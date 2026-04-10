'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function AdminKPICards() {
  const [kpis, setKpis] = useState({
    totalAssets: 0,
    activeWorkOrders: 0,
    overdueWorkOrders: 0,
    completedToday: 0,
    avgMTBF: 0,
    avgMTTR: 0,
    oee: 0,
    uptime: 0
  });

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    try {
      const kpisRes = await api.get('/analytics/kpis');
      if (kpisRes.data) {
        const kpiData = kpisRes.value.data.data || kpisRes.data.data || kpisRes.data;
        setKpis(kpiData);
      }
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
    }
  };

  return (
    <>
      {/* Top Row KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/assets/machines" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Total Assets</p>
          <p className="text-lg font-semibold text-gray-800">{kpis.totalAssets}</p>
          <p className="text-sm text-green-600 mt-2">↑ {kpis.assetGrowth || 0}%</p>
        </Link>

        <Link href="/maintenance/work-orders" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Active Work Orders</p>
          <p className="text-lg font-semibold text-gray-800">{kpis.activeWorkOrders}</p>
          <p className="text-sm text-green-600 mt-2">↓ {kpis.workOrderReduction || 0}%</p>
        </Link>

        <Link href="/maintenance/work-orders?status=overdue" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Overdue Work Orders</p>
          <p className="text-lg font-semibold text-gray-800">{kpis.overdueWorkOrders}</p>
        </Link>

        <Link href="/maintenance/work-orders?status=completed&date=today" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Completed Today</p>
          <p className="text-lg font-semibold text-gray-800">{kpis.completedToday}</p>
          <p className="text-sm text-green-600 mt-2">↑ {kpis.completionImprovement || 0}%</p>
        </Link>
      </div>

      {/* Bottom Row KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/analytics?metric=mtbf" className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold">MTBF (Hours)</h3>
            <span className="text-blue-500 text-xs bg-blue-50 px-2 py-1 rounded">Avg</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{kpis.avgMTBF}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600">↑ {kpis.mtbfImprovement || 0}%</span>
            <span className="text-gray-500 ml-2">vs last month</span>
          </div>
        </Link>

        <Link href="/analytics?metric=mttr" className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold">MTTR (Hours)</h3>
            <span className="text-orange-500 text-xs bg-orange-50 px-2 py-1 rounded">Avg</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{kpis.avgMTTR}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600">↓ {kpis.mttrImprovement || 0}%</span>
            <span className="text-gray-500 ml-2">improvement</span>
          </div>
        </Link>

        <Link href="/analytics?metric=oee" className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold">OEE Score</h3>
            <span className="text-green-500 text-xs bg-green-50 px-2 py-1 rounded">Target: 85%</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{kpis.oee}%</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{width: `${kpis.oee}%`}}></div>
          </div>
        </Link>

        <Link href="/settings/system" className="bg-white p-6 rounded-lg shadow border-l-4 border-teal-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold">System Uptime</h3>
            <span className="text-teal-500 text-xs bg-teal-50 px-2 py-1 rounded">Live</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{kpis.uptime}%</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600">● Online</span>
            <span className="text-gray-500 ml-2">All systems operational</span>
          </div>
        </Link>
      </div>
    </>
  );
}
