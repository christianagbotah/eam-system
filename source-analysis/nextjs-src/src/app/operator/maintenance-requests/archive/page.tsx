'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import FormModal from '@/components/ui/FormModal';
import WorkflowTimeline from '@/components/WorkflowTimeline';
import { Eye, Archive, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function MaintenanceRequestsArchivePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/maintenance-requests/archive');
      setRequests(response.data?.data || []);
    } catch (error: any) {
      console.error('Error loading archive:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-gray-600 to-gray-800 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <div className="flex items-center gap-2">
          <a
            href="/operator/maintenance-requests"
            className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all border-2 border-white/30"
          >
            <ArrowLeft className="w-6 h-6" />
          </a>
          <Archive className="w-12 h-12" />
          <div>
            <h1 className="text-4xl font-bold">Request Archive</h1>
            <p className="text-gray-200">View completed and closed maintenance requests</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl p-6 h-32" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Archived Requests</h3>
              <p className="text-gray-500">Closed requests will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{req.title}</h3>
                        <span className="text-xs font-mono text-gray-500">#{req.request_number}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle className="w-3 h-3 inline mr-1" />
                          CLOSED
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">{req.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(req.priority || 'medium')}`}>
                          {(req.priority || 'medium').toUpperCase()}
                        </span>
                        {req.location && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            📍 {req.location}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Closed: {formatDate(req.closed_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setViewingRequest(req); setShowDetailsModal(true); }}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors font-semibold inline-flex items-center gap-2 border-2 border-blue-200"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FormModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Archived Request Details"
        size="xl"
      >
        {viewingRequest && (
          <div className="space-y-6">
            <WorkflowTimeline 
              currentStatus={viewingRequest.workflow_status || 'closed'} 
              isRejected={false}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Request Number</label>
                <p className="mt-1 text-lg font-medium text-gray-900">{viewingRequest.request_number || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Priority</label>
                <div className="mt-1">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getPriorityColor(viewingRequest.priority || 'medium')}`}>
                    {(viewingRequest.priority || 'medium').toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Requested By</label>
                <p className="mt-1 text-lg font-medium text-gray-900">{viewingRequest.requested_by_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Department</label>
                <p className="mt-1 text-lg font-medium text-gray-900">{viewingRequest.department_name || 'N/A'}</p>
              </div>
            </div>
            <div className="border-t pt-6">
              <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Title</label>
              <p className="mt-1 text-lg font-medium text-gray-900">{viewingRequest.title}</p>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Description</label>
              <p className="mt-1 text-gray-700 leading-relaxed">{viewingRequest.description}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-6">
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Closed At</label>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {viewingRequest.closed_at ? formatDateTime(viewingRequest.closed_at) : 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Created At</label>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {viewingRequest.created_at ? formatDateTime(viewingRequest.created_at) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </FormModal>
    </div>
  );
}
