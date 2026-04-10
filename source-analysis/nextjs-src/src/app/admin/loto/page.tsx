'use client';

import { useState, useEffect } from 'react';
import { Lock, CheckCircle, Plus } from 'lucide-react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import RBACGuard from '@/components/RBACGuard';

function LOTOContent() {
  const [applications, setApplications] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [locks, setLocks] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('applications');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'applications') {
        const res = await api.get('/loto/active');
        setApplications(res.data?.data || []);
      } else if (activeTab === 'procedures') {
        const res = await api.get('/loto-procedures');
        setProcedures(res.data?.data || []);
      } else {
        const res = await api.get('/loto-locks');
        setLocks(res.data?.data || []);
      }
    } catch (error) {
      console.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      applied: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      removed: 'bg-gray-100 text-gray-800',
      available: 'bg-green-100 text-green-800',
      in_use: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-yellow-600 to-red-600 rounded-2xl shadow-2xl p-8 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Lock className="w-12 h-12" />
              LOTO Management
            </h1>
            <p className="text-yellow-100">Lockout/Tagout Energy Isolation</p>
          </div>
          <button className="px-3 py-1.5 text-sm bg-white text-orange-600 rounded-lg hover:bg-orange-50 font-bold inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Apply LOTO
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex gap-2">
        {['applications', 'procedures', 'locks'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${
              activeTab === tab ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          </div>
        ) : (
          <div className="divide-y">
            {activeTab === 'applications' && applications.map((app) => (
              <div key={app.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{app.equipment_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  {app.zero_energy_confirmed && (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                </div>
              </div>
            ))}
            {activeTab === 'procedures' && procedures.map((proc) => (
              <div key={proc.id} className="p-6 hover:bg-gray-50">
                <h3 className="font-bold">{proc.procedure_name}</h3>
                <p className="text-sm text-gray-600">{proc.procedure_code}</p>
              </div>
            ))}
            {activeTab === 'locks' && locks.map((lock) => (
              <div key={lock.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-bold">{lock.lock_number}</h3>
                    <p className="text-sm text-gray-600">{lock.lock_type}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(lock.status)}`}>
                    {lock.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LOTOPage() {
  return (
    <RBACGuard module="loto" action="view">
      <LOTOContent />
    </RBACGuard>
  );
}
