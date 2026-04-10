'use client';

import { useState, useEffect } from 'react';
import { productionSurveyService } from '@/services/productionSurveyService';
import DashboardLayout from '@/components/DashboardLayout';

export default function EnergyDashboardPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await productionSurveyService.getAll({ status: 'Approved' });
      setSurveys(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPower = surveys.reduce((sum, s) => sum + (parseFloat(s.power_consumption_kwh) || 0), 0);
  const totalCarbon = surveys.reduce((sum, s) => sum + (parseFloat(s.carbon_footprint_kg) || 0), 0);
  const totalCost = surveys.reduce((sum, s) => sum + (parseFloat(s.energy_cost) || 0), 0);

  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">⚡ Energy & Sustainability Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Power</div>
            <div className="text-base font-semibold text-yellow-600">{totalPower.toFixed(2)} kWh</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Carbon Footprint</div>
            <div className="text-base font-semibold text-green-600">{totalCarbon.toFixed(2)} kg CO₂</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Energy Cost</div>
            <div className="text-base font-semibold text-blue-600">${totalCost.toFixed(2)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Avg per Survey</div>
            <div className="text-base font-semibold">
              {surveys.length > 0 ? (totalPower / surveys.length).toFixed(2) : 0} kWh
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Energy Consumption by Utility</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Power (kWh)</span>
                <span className="font-semibold">{totalPower.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-yellow-500 h-3 rounded-full" style={{width: '100%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Compressed Air (m³)</span>
                <span className="font-semibold">
                  {surveys.reduce((sum, s) => sum + (parseFloat(s.compressed_air_m3) || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{width: '75%'}}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Water (liters)</span>
                <span className="font-semibold">
                  {surveys.reduce((sum, s) => sum + (parseFloat(s.water_consumption_liters) || 0), 0).toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-cyan-500 h-3 rounded-full" style={{width: '50%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
