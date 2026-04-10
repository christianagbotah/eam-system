'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function PartDetailsPage() {
  const params = useParams();
  const [part, setPart] = useState<any>(null);
  const [pmTasks, setPmTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPart();
      fetchPmTasks();
    }
  }, [params.id]);

  const fetchPart = async () => {
    try {
      const response = await api.get(`/parts/${params.id}`);
      const data = response.data;
      setPart(data.data);
    } catch (error) {
      console.error('Error fetching part:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPmTasks = async () => {
    try {
      const response = await api.get(`/part-pm-tasks/part/${params.id}`);
      const data = response.data;
      setPmTasks(data.data || []);
    } catch (error) {
      console.error('Error fetching PM tasks:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!part) {
    return <div className="text-center py-12">Part not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{part.part_name}</h1>
          <p className="text-gray-600">Part Number: {part.part_number}</p>
        </div>
        <Link href="/parts/partLists" className="text-blue-600 hover:underline">
          ← Back to Parts
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Part Image */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Part Image</h2>
          </div>
          <div className="p-6">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
              {part.part_image || part.image ? (
                <img 
                  src={part.part_image || part.image} 
                  alt={part.part_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
                  <svg className="w-16 h-16 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          {/* Part Overview */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Part Information</h2>
                  <p className="text-sm text-gray-600">Complete part specifications and details</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Part Name</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">{part.part_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Part Number</label>
                    <p className="mt-1 text-sm font-mono bg-gray-100 px-3 py-1 rounded">{part.part_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Category</label>
                    <div className="mt-1">
                      {part.part_category ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                          {part.part_category}
                        </span>
                      ) : (
                        <span className="text-gray-500">Not specified</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Manufacturer</label>
                    <p className="mt-1 text-sm text-gray-900">{part.manufacturer || 'Not specified'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Material</label>
                    <p className="mt-1 text-sm text-gray-900">{part.material || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dimensions</label>
                    <p className="mt-1 text-sm text-gray-900">{part.dimensions || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Expected Lifespan</label>
                    <p className="mt-1 text-sm text-gray-900">{part.expected_lifespan || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                        part.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                        part.status === 'inactive' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          part.status === 'active' ? 'bg-green-500' :
                          part.status === 'inactive' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></span>
                        {part.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {part.description && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Description</label>
                  <p className="mt-2 text-gray-700 leading-relaxed">{part.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* PM Tasks */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">PM Tasks</h2>
                    <p className="text-sm text-gray-600">{pmTasks.length} maintenance tasks assigned</p>
                  </div>
                </div>
                <Link href={`/parts/assignPmTasksToPart/${part.id}`} className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm font-medium">
                  + Add Task
                </Link>
              </div>
            </div>
            <div className="p-6">
              {pmTasks.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-500 mb-4">No PM tasks assigned yet</p>
                  <Link href={`/parts/assignPmTasksToPart/${part.id}`} className="text-orange-600 hover:text-orange-700 font-medium">
                    Assign PM Tasks →
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {pmTasks.map((task: any) => (
                    <div key={task.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-gray-900">{task.task_name}</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{task.type_name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Frequency:</span>
                          <span className="ml-2 font-medium">{task.frequency_value} {task.trigger_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Mode:</span>
                          <span className="ml-2 font-medium">{task.mode_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="ml-2 font-medium">{task.estimated_duration}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Inspection:</span>
                          <span className="ml-2 font-medium">{task.inspection_name}</span>
                        </div>
                      </div>
                      {task.next_due_date && (
                        <div className="mt-3 pt-3 border-t">
                          <span className="text-sm text-gray-500">Next Due:</span>
                          <span className="ml-2 text-sm font-medium text-orange-600">{formatDate(task.next_due_date)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Inventory & Maintenance */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z"/><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Inventory & Maintenance</h2>
                  <p className="text-sm text-gray-600">Stock levels and maintenance information</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{part.current_stock_qty || 0}</div>
                  <div className="text-sm text-gray-600">Current Stock</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">${part.unit_cost || '0.00'}</div>
                  <div className="text-sm text-gray-600">Unit Cost</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold ${
                    part.spare_availability === 'yes' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {part.spare_availability === 'yes' ? '✓' : '✗'}
                  </div>
                  <div className="text-sm text-gray-600">Spare Available</div>
                </div>
              </div>
              
              {part.safety_notes && (
                <div className="mb-6">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"/>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">Safety Notes</h3>
                        <p className="mt-1 text-sm text-yellow-700">{part.safety_notes}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {part.failure_modes && (
                <div>
                  <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Common Failure Modes</h3>
                        <p className="mt-1 text-sm text-red-700">{part.failure_modes}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              <Link href={`/parts/${part.id}/edit`} className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Edit Part
              </Link>
              <button className="block w-full text-center bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
                Upload Media
              </button>
              <button className="block w-full text-center bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                View History
              </button>
              <Link href={`/parts/assignPmTasksToPart/${part.id}`} className="block w-full text-center bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium">
                PM Tasks
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Part Hierarchy</h3>
            </div>
            <div className="p-6">
              {part.parent_part_id ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sub-part of:</p>
                    <Link href={`/parts/${part.parent_part_id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                      Parent Part →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Top-level part</p>
                    <p className="text-xs text-green-600">No parent component</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Part Stats</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Stock Level</span>
                <span className={`text-lg font-bold ${
                  part.current_stock_qty > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {part.current_stock_qty || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Unit Value</span>
                <span className="text-lg font-bold text-blue-600">${part.unit_cost || '0.00'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Value</span>
                <span className="text-lg font-bold text-purple-600">
                  ${((part.current_stock_qty || 0) * (parseFloat(part.unit_cost) || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}