'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Download, Plus } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/suppliers');
        setSuppliers(response.data?.data || []);
      } catch (error) {
        toast.error('Failed to load suppliers');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-gray-600 mt-1">Manage supplier information</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">Loading...</div>
          ) : suppliers.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">No suppliers found</div>
          ) : (
            suppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{supplier.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{supplier.contact_person}</p>
                  </div>
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium text-gray-900">{supplier.email}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Phone:</span>
                    <p className="font-medium text-gray-900">{supplier.phone}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Rating:</span>
                    <p className="font-semibold text-yellow-600">{supplier.rating || 'N/A'}</p>
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
