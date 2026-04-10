'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';
import SurveyForm from '@/components/production/SurveyForm';
import { productionService } from '@/services/productionService';
import { toast } from '@/lib/toast';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function ProductionPage() {
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadRuns(); }, []);

  const loadRuns = async () => {
    try {
      const result = await productionService.getProductionRuns();
      setRuns(result.data || []);
    } catch (error: any) {
      toast.error('Failed to load production runs');
    }
  };

  const handleSurveySubmit = async (surveyData: any) => {
    if (!selectedRun) return;
    setLoading(true);
    try {
      await productionService.createSurvey(selectedRun.id, surveyData);
      toast.success('Survey submitted successfully');
      setShowSurveyModal(false);
      setSelectedRun(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit survey');
    } finally {
      setLoading(false);
    }
  };

  const openSurveyModal = (run: any) => {
    setSelectedRun(run);
    setShowSurveyModal(true);
  };

  return (
    <DashboardLayout role="operator">
      <div className="p-6">
        <h1 className="text-base font-semibold mb-6">Production Runs</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {runs.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No production runs available
            </div>
          ) : (
            runs.map((run: any) => (
              <div key={run.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg">Run #{run.id}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    run.status === 'completed' ? 'bg-green-100 text-green-800' :
                    run.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>{run.status}</span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>Product: {run.product_name || 'N/A'}</p>
                  <p>Quantity: {run.quantity || 'N/A'}</p>
                  <p>Started: {run.start_time ? formatDateTime(run.start_time) : 'N/A'}</p>
                </div>

                <button
                  onClick={() => openSurveyModal(run)}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-sm font-medium"
                >
                  Create Survey
                </button>
              </div>
            ))
          )}
        </div>

        <Modal
          isOpen={showSurveyModal}
          onClose={() => {
            setShowSurveyModal(false);
            setSelectedRun(null);
          }}
          title={`Production Survey - Run #${selectedRun?.id}`}
        >
          {selectedRun && (
            <SurveyForm
              runId={selectedRun.id}
              onSubmit={handleSurveySubmit}
              loading={loading}
            />
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
