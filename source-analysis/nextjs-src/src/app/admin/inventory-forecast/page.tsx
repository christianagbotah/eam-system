'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Package, AlertTriangle, Download } from 'lucide-react';

interface ForecastData {
  part_id: number;
  part_name: string;
  part_number: string;
  current_stock: number;
  avg_monthly_consumption: number;
  forecasted_consumption_30d: number;
  forecasted_consumption_90d: number;
  reorder_recommendation: string;
  stock_out_risk: 'low' | 'medium' | 'high';
  recommended_order_qty: number;
}

export default function InventoryForecastPage() {
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'30' | '90'>('30');

  useEffect(() => {
    fetchForecasts();
  }, [timeframe]);

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/eam/inventory/forecast?days=${timeframe}`);
      const data = await response.json();
      setForecasts(data.data || []);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (risk: string) => {
    const configs = {
      low: { bg: 'bg-green-100', text: 'text-green-800' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      high: { bg: 'bg-red-100', text: 'text-red-800' }
    };
    const config = configs[risk as keyof typeof configs];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {risk.toUpperCase()}
      </span>
    );
  };

  const exportData = () => {
    const csv = [
      ['Part Name', 'Part Number', 'Current Stock', 'Avg Monthly', 'Forecast', 'Risk', 'Recommended Order'],
      ...forecasts.map(f => [
        f.part_name,
        f.part_number,
        f.current_stock,
        f.avg_monthly_consumption,
        timeframe === '30' ? f.forecasted_consumption_30d : f.forecasted_consumption_90d,
        f.stock_out_risk,
        f.recommended_order_qty
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-forecast-${timeframe}d.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Inventory Forecasting
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">Predict future inventory needs based on PM schedules</p>
        </div>
        <button
          onClick={exportData}
          className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setTimeframe('30')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              timeframe === '30' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeframe('90')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              timeframe === '90' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Monthly</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Forecast</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recommended Order</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {forecasts.map((forecast) => (
                <tr key={forecast.part_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{forecast.part_name}</div>
                    <div className="text-sm text-gray-500">{forecast.part_number}</div>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-900">{forecast.current_stock}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-900">{forecast.avg_monthly_consumption}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-900">
                    {timeframe === '30' ? forecast.forecasted_consumption_30d : forecast.forecasted_consumption_90d}
                  </td>
                  <td className="px-6 py-4">{getRiskBadge(forecast.stock_out_risk)}</td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-blue-600">{forecast.recommended_order_qty}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
