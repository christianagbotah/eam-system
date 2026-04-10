'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Package, ArrowRight, ArrowLeft, CheckCircle, Clock, TrendingUp, Wrench } from 'lucide-react';

export default function ShopAttendantDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    readyToIssue: 0,
    issued: 0,
    pendingReturn: 0,
    totalActive: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/tool-requests');
      const data = response.data.data || [];
      
      setStats({
        readyToIssue: data.filter((r: any) => r.request_status === 'APPROVED').length,
        issued: data.filter((r: any) => r.request_status === 'ISSUED').length,
        pendingReturn: data.filter((r: any) => r.request_status === 'RETURN_PENDING').length,
        totalActive: data.filter((r: any) => ['APPROVED', 'ISSUED', 'RETURN_PENDING'].includes(r.request_status)).length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📦 Shop Attendant Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Manage tool issuance and returns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-5 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Ready to Issue</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{stats.readyToIssue}</p>
            </div>
            <div className="bg-blue-500 rounded-full p-3">
              <ArrowRight className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm p-5 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Currently Issued</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{stats.issued}</p>
            </div>
            <div className="bg-green-500 rounded-full p-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm p-5 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Pending Return</p>
              <p className="text-3xl font-bold text-orange-900 mt-1">{stats.pendingReturn}</p>
            </div>
            <div className="bg-orange-500 rounded-full p-3">
              <ArrowLeft className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm p-5 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Total Active</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{stats.totalActive}</p>
            </div>
            <div className="bg-purple-500 rounded-full p-3">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          onClick={() => router.push('/shop-attendant/tool-issuance')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 rounded-full p-4">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Tool Issuance & Returns</h3>
              <p className="text-sm text-gray-600 mt-1">Issue approved tools and process returns</p>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-400" />
          </div>
        </div>

        <div 
          onClick={() => router.push('/shop-attendant/tools')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-green-100 rounded-full p-4">
              <Wrench className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Tool Management</h3>
              <p className="text-sm text-gray-600 mt-1">View and manage tool inventory</p>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-400" />
          </div>
        </div>

        <div 
          onClick={() => router.push('/shop-attendant/inventory')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 rounded-full p-4">
              <Package className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Inventory Management</h3>
              <p className="text-sm text-gray-600 mt-1">Manage spare parts and materials</p>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-400" />
          </div>
        </div>

        <div 
          onClick={() => router.push('/shop-attendant/material-approvals')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 rounded-full p-4">
              <CheckCircle className="h-8 w-8 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Material Approvals</h3>
              <p className="text-sm text-gray-600 mt-1">Review and approve material requests</p>
            </div>
            <ArrowRight className="h-6 w-6 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500 rounded-full p-2 mt-1">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Quick Actions</h3>
            <ul className="mt-3 space-y-2 text-sm text-blue-800">
              <li>• Issue tools for {stats.readyToIssue} approved requests</li>
              <li>• Process returns for {stats.pendingReturn} pending items</li>
              <li>• Monitor {stats.issued} currently issued tools</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
