'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { productionSurveyService, ProductionSurvey } from '@/services/productionSurveyService';
import DashboardLayout from '@/components/DashboardLayout';

export default function ViewSurveyPage() {
  const router = useRouter();
  const params = useParams();
  const [survey, setSurvey] = useState<ProductionSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadSurvey();
  }, [params.id]);

  const loadSurvey = async () => {
    try {
      const response = await productionSurveyService.getById(Number(params.id));
      setSurvey(response.data);
    } catch (error) {
      console.error('Error loading survey:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (confirm('Approve this survey?')) {
      try {
        await productionSurveyService.approve(Number(params.id));
        alert('Survey approved');
        loadSurvey();
      } catch (error) {
        alert('Error approving survey');
      }
    }
  };

  const handleReject = async () => {
    try {
      await productionSurveyService.reject(Number(params.id), rejectReason);
      alert('Survey rejected');
      setShowRejectModal(false);
      loadSurvey();
    } catch (error) {
      alert('Error rejecting survey');
    }
  };

  if (loading) return <DashboardLayout><div className="p-6">Loading...</div></DashboardLayout>;
  if (!survey) return <DashboardLayout><div className="p-6">Survey not found</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Survey Details</h1>
          <div className="space-x-2">
            {survey.status === 'Submitted' && (
              <>
                <button
                  onClick={handleApprove}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </>
            )}
            <button
              onClick={() => router.back()}
              className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Back
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Survey Code</label>
              <div className="font-medium">{survey.survey_code}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Status</label>
              <div className="font-medium">{survey.status}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Machine</label>
              <div className="font-medium">{survey.machine_name}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Date</label>
              <div className="font-medium">{survey.date}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Shift</label>
              <div className="font-medium">{survey.shift}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Operator</label>
              <div className="font-medium">{survey.operator_name}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Start Time</label>
              <div className="font-medium">{survey.start_time}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">End Time</label>
              <div className="font-medium">{survey.end_time}</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Runtime</label>
              <div className="font-medium">{survey.runtime_minutes} minutes</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Downtime</label>
              <div className="font-medium text-red-600">{survey.downtime_minutes} minutes</div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Defects Count</label>
              <div className="font-medium">{survey.defects_count}</div>
            </div>
            {survey.supervisor_name && (
              <div>
                <label className="text-sm text-gray-600">Supervisor</label>
                <div className="font-medium">{survey.supervisor_name}</div>
              </div>
            )}
          </div>

          {survey.downtime_reason && (
            <div>
              <label className="text-sm text-gray-600">Downtime Reason</label>
              <div className="mt-1 p-3 bg-gray-50 rounded">{survey.downtime_reason}</div>
            </div>
          )}

          {survey.comments && (
            <div>
              <label className="text-sm text-gray-600">Comments</label>
              <div className="mt-1 p-3 bg-gray-50 rounded">{survey.comments}</div>
            </div>
          )}
        </div>

        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Reject Survey</h2>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full border rounded px-3 py-2 mb-4"
                rows={4}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
