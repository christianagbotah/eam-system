'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { TrendingUp, Download } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function SPCPage() {
  const [spcData, setSpcData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSPCData();
  }, []);

  const loadSPCData = async () => {
    try {
      const response = await api.get('/spc');
      setSpcData(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load SPC data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Statistical Process Control</h1>
            <p className="text-gray-600 mt-1">Monitor process variation and control limits</p>
          </div>
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium inline-flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Control Chart</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spcData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sample" />
                <YAxis />
                <Tooltip />
                <Legend />
                <ReferenceLine y={100} stroke="green" strokeDasharray="3 3" label="UCL" />
                <ReferenceLine y={50} stroke="blue" strokeDasharray="3 3" label="Target" />
                <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" label="LCL" />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm text-gray-600 mb-2">Process Capability (Cpk)</h3>
            <p className="text-2xl font-bold text-gray-900">1.33</p>
            <p className="text-xs text-green-600 mt-1">Within specification</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm text-gray-600 mb-2">Out of Control Points</h3>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-xs text-green-600 mt-1">Process stable</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm text-gray-600 mb-2">Sigma Level</h3>
            <p className="text-2xl font-bold text-gray-900">4.5σ</p>
            <p className="text-xs text-blue-600 mt-1">Good performance</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
