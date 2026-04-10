'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertTriangle, Download } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function BottlenecksPage() {
  const [bottlenecks, setBottlenecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBottlenecks();
  }, []);

  const loadBottlenecks = async () => {
    try {
      const response = await api.get('/production-bottlenecks');
      setBottlenecks(response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load bottlenecks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bottleneck Analysis</h1>
            <p className="text-gray-600 mt-1">Identify production constraints</p>
          </div>
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium inline-flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : bottlenecks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No bottlenecks detected</div>
          ) : (
            bottlenecks.map((bottleneck) => (
              <div key={bottleneck.id} className="bg-white rounded-xl shadow-sm border-l-4 border-red-500 p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{bottleneck.location}</h3>
                    <p className="text-sm text-gray-600 mt-1">{bottleneck.description}</p>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <span className="text-xs text-gray-500">Impact</span>
                        <p className="text-sm font-semibold text-red-600">{bottleneck.impact}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Duration</span>
                        <p className="text-sm font-semibold text-gray-900">{bottleneck.duration}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Severity</span>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          bottleneck.severity === 'high' ? 'bg-red-100 text-red-800' :
                          bottleneck.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {bottleneck.severity?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
