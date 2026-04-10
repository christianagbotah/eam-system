'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import api from '@/lib/api';

interface EnergyData {
  total_consumption: number;
  total_cost: number;
  peak_demand: number;
  carbon_footprint: number;
  by_asset: Array<{asset_name: string; consumption: number; cost: number}>;
  by_department: Array<{department: string; consumption: number; cost: number}>;
  hourly_data: Array<{hour: string; consumption: number}>;
}

export default function EnergyPage() {
  const [data, setData] = useState<EnergyData | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);

  const handleExport = () => {
    if (!data) return;
    const csv = [Object.keys(data.by_asset[0] || {}).join(','), ...data.by_asset.map(a => Object.values(a).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `energy-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Energy data exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  useEffect(() => {
    fetchEnergyData();
  }, [dateRange]);

  const fetchEnergyData = async () => {
    try {
      const res = await api.get(`/energy/dashboard?start=${dateRange.start}&end=${dateRange.end}`);
      const result = res.data;
      if (result.status === 'success') {
        setData(result.data);
      }
    } catch (error) {
      showToast.error('Failed to fetch energy data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) return <div className="p-6"><CardSkeleton count={8} /></div>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-base font-semibold">Energy Management</h1>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange({...dateRange, start: e.target.value})}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange({...dateRange, end: e.target.value})}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Total Consumption</div>
          <div className="text-lg font-semibold">{data.total_consumption.toFixed(2)} kWh</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Total Cost</div>
          <div className="text-lg font-semibold">${data.total_cost.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Peak Demand</div>
          <div className="text-lg font-semibold">{data.peak_demand.toFixed(2)} kW</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Carbon Footprint</div>
          <div className="text-lg font-semibold">{data.carbon_footprint.toFixed(2)} kg CO₂</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Consumption by Asset</h2>
          <div className="space-y-3">
            {data.by_asset.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.asset_name}</span>
                  <span className="font-semibold">{item.consumption.toFixed(2)} kWh</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(item.consumption / data.total_consumption) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">${item.cost.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">Consumption by Department</h2>
          <div className="space-y-3">
            {data.by_department.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{item.department}</span>
                  <span className="font-semibold">{item.consumption.toFixed(2)} kWh</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${(item.consumption / data.total_consumption) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">${item.cost.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold mb-4">Hourly Consumption Pattern</h2>
        <div className="h-64 flex items-end justify-between gap-1">
          {data.hourly_data.map((item, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${(item.consumption / Math.max(...data.hourly_data.map(d => d.consumption))) * 100}%` }}
                title={`${item.hour}: ${item.consumption.toFixed(2)} kWh`}
              />
              <div className="text-xs mt-1 transform -rotate-45 origin-top-left">{item.hour}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
