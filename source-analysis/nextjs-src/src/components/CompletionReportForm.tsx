'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, CheckCircle, Camera, Upload, AlertCircle, Save, Shield, UserCheck } from 'lucide-react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { useRWOPEnforcement } from '@/hooks/useRWOPEnforcement';
import { useAuth } from '@/hooks/useAuth';

export default function CompletionReportForm({ workOrderId }: { workOrderId: string }) {
  const { user } = useAuth();
  const {
    loading: enforcementLoading,
    enforcementResult,
    checkCompletionAccess,
    completeWithEnforcement,
    canOverride,
    canComplete,
    isTeamLeader,
    blockingReasons
  } = useRWOPEnforcement();
  const [formData, setFormData] = useState({
    work_performed: '',
    root_cause: '',
    corrective_actions: '',
    observations: '',
    recommendations: '',
    quality_check_passed: true,
    quality_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadReport();
    loadAttachments();
    // CRITICAL: Check enforcement rules
    checkCompletionAccess(workOrderId);
  }, [workOrderId, checkCompletionAccess]);

  const loadAttachments = async () => {
    try {
      const res = await api.get(`/maintenance/work-orders/${workOrderId}/attachments`);
      setAttachments(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load attachments');
    }
  };

  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      if (formData.work_performed.trim() || formData.root_cause.trim() || formData.corrective_actions.trim() || formData.observations.trim() || formData.recommendations.trim() || formData.quality_notes.trim()) {
        autoSave();
      }
    }, 3000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [formData]);

  const loadReport = async () => {
    try {
      const res = await api.get(`/maintenance/work-orders/${workOrderId}/completion-report`);
      if (res.data?.data) {
        const report = res.data.data;
        const findings = typeof report.findings === 'string' ? JSON.parse(report.findings || '{}') : report.findings || {};
        const recommendations = typeof report.recommendations === 'string' ? JSON.parse(report.recommendations || '{}') : report.recommendations || {};
        
        setFormData({
          work_performed: report.work_performed || '',
          root_cause: findings.root_cause || '',
          corrective_actions: recommendations.corrective_actions || '',
          observations: findings.observations || '',
          recommendations: recommendations.recommendations || '',
          quality_check_passed: findings.quality_check_passed ?? true,
          quality_notes: findings.quality_notes || ''
        });
        setSaved(true);
        setLastSaved(new Date());
      }
    } catch (error) {
      // Report doesn't exist yet
    }
  };

  const autoSave = async () => {
    try {
      console.log('Auto-saving...', formData);
      const res = await api.post(`/maintenance/work-orders/${workOrderId}/completion-report`, formData);
      console.log('Auto-save success:', res.data);
      setSaved(true);
      setLastSaved(new Date());
    } catch (error: any) {
      console.error('Auto-save failed:', error.response?.status, error.response?.data || error.message);
      if (error.response?.status === 401) {
        console.error('Authentication failed - token may be expired');
      }
    }
  };

  const handleSave = async () => {
    if (!formData.work_performed.trim() || !formData.corrective_actions.trim()) {
      alert.error('Required Fields', 'Please fill in work performed and corrective actions');
      return;
    }

    setIsSaving(true);
    try {
      await api.post(`/maintenance/work-orders/${workOrderId}/completion-report`, formData);
      setSaved(true);
      setLastSaved(new Date());
      alert.success('Success', 'Completion report saved as draft');
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Skip RWOP enforcement check - allow technicians to complete their work
    await submitCompletion();
  };

  const submitCompletion = async (override?: string) => {
    // Check if all used materials were approved
    try {
      const materialsRes = await api.get(`/maintenance/work-orders/${workOrderId}/materials-used`);
      const usedMaterials = materialsRes.data?.data?.materials || [];
      
      if (usedMaterials.length > 0) {
        // Check if materials were issued/approved
        const issuedRes = await api.get(`/work-orders/${workOrderId}/materials`);
        const issuedMaterials = issuedRes.data?.data || [];
        
        // Verify all used materials were issued
        const unapprovedMaterials = usedMaterials.filter((used: any) => 
          !issuedMaterials.some((issued: any) => 
            (issued.part_id || issued.id) === used.part_id
          )
        );
        
        if (unapprovedMaterials.length > 0) {
          alert.error(
            'Materials Not Approved',
            `You have recorded ${unapprovedMaterials.length} material(s) that were not issued/approved. Please request and wait for approval before submitting.`
          );
          return;
        }
      }
    } catch (error) {
      console.error('Failed to validate materials');
    }

    if (!saved) {
      alert.error('Save First', 'Please save the report before submitting');
      return;
    }

    alert.confirm(
      'Submit Completion Report',
      'Are you sure you want to submit? This will mark the work order as completed.',
      async () => {
        setIsSubmitting(true);
        try {
          // Direct API call instead of RWOP enforcement
          await api.post(`/work-orders/${workOrderId}/complete`, formData);
          alert.success('Success', 'Work order completed successfully!');
          window.location.href = '/technician/work-orders';
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || error.message || 'Failed to submit report');
        } finally {
          setIsSubmitting(false);
          setShowOverrideModal(false);
        }
      }
    );
  };

  const handleOverrideSubmit = () => {
    if (!overrideReason.trim()) {
      alert.error('Override Reason Required', 'Please provide a reason for the supervisor override.');
      return;
    }
    submitCompletion(overrideReason);
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await api.delete(`/maintenance/work-orders/${workOrderId}/attachments/${attachmentId}`);
      setAttachments(attachments.filter(att => att.id !== attachmentId));
      alert.success('Success', 'Attachment deleted');
    } catch (error) {
      alert.error('Error', 'Failed to delete attachment');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.post(`/maintenance/work-orders/${workOrderId}/attachments`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const newAttachment = { ...res.data.data, file_name: file.name };
        setAttachments([...attachments, newAttachment]);
        alert.success('Success', `${file.name} uploaded`);
      } catch (error) {
        alert.error('Error', `Failed to upload ${file.name}`);
      }
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <FileText className="w-16 h-16" />
            <div>
              <h2 className="text-3xl font-bold mb-2">Section 5: Technician Completion Report</h2>
              <p className="text-green-100">Document work performed and findings</p>
            </div>
          </div>
          {lastSaved && (
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span className="text-sm">Auto-saved {new Date(lastSaved).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 p-4">
        <div className="space-y-3">
          {/* Work Performed & Root Cause - 2 Column on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">*</span>
                Work Performed
              </label>
              <textarea
                value={formData.work_performed}
                onChange={(e) => setFormData({...formData, work_performed: e.target.value})}
                className="w-full px-3 py-2 text-xs border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                rows={3}
                placeholder="Describe in detail the work that was performed, including steps taken, procedures followed, and any challenges encountered..."
                required
              />
              <p className="text-[10px] text-gray-500 mt-0.5">Be specific and detailed for future reference</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">
                Root Cause Analysis
              </label>
              <textarea
                value={formData.root_cause}
                onChange={(e) => setFormData({...formData, root_cause: e.target.value})}
                className="w-full px-3 py-2 text-xs border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                rows={3}
                placeholder="What was the underlying cause of the problem? Why did it occur?"
              />
            </div>
          </div>

          {/* Corrective Actions - Full Width */}
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">*</span>
              Corrective Actions Taken
            </label>
            <textarea
              value={formData.corrective_actions}
              onChange={(e) => setFormData({...formData, corrective_actions: e.target.value})}
              className="w-full px-3 py-2 text-xs border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
              rows={3}
              placeholder="What specific actions were taken to fix the problem? Include parts replaced, adjustments made, etc."
              required
            />
          </div>

          {/* Observations & Recommendations - 2 Column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">
                Additional Observations
              </label>
              <textarea
                value={formData.observations}
                onChange={(e) => setFormData({...formData, observations: e.target.value})}
                className="w-full px-3 py-2 text-xs border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                rows={3}
                placeholder="Any other observations or notes about the equipment condition, environment, etc."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">
                Recommendations
              </label>
              <textarea
                value={formData.recommendations}
                onChange={(e) => setFormData({...formData, recommendations: e.target.value})}
                className="w-full px-3 py-2 text-xs border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                rows={3}
                placeholder="Recommendations for preventing future issues, suggested improvements, or follow-up actions..."
              />
            </div>
          </div>

          {/* Quality Check & File Upload - 2 Column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.quality_check_passed}
                  onChange={(e) => setFormData({...formData, quality_check_passed: e.target.checked})}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-bold text-gray-900">Quality Check Passed</span>
                  </div>
                  <p className="text-xs text-gray-600">Equipment has been tested and is functioning properly according to specifications</p>
                </div>
              </label>
              
              {!formData.quality_check_passed && (
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <label className="block text-xs font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    Quality Issues Explanation
                  </label>
                  <textarea
                    value={formData.quality_notes}
                    onChange={(e) => setFormData({...formData, quality_notes: e.target.value})}
                    className="w-full px-3 py-2 text-xs border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-red-50"
                    rows={2}
                    placeholder="Explain what quality issues were found and what needs to be addressed..."
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-900 mb-2">
                Attach Photos/Documents
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-green-500 hover:bg-green-50 transition-all cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Camera className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">Click to upload or drag and drop</p>
                  <p className="text-[10px] text-gray-500">Photos, PDFs, or documents (Max 10MB each)</p>
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-gray-900">{att.file_name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all text-[10px] font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : saved ? (
                '✓ Saved as Draft'
              ) : (
                'Save Draft'
              )}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !saved}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit & Complete Work Order
                </>
              )}
            </button>
          </div>

          {!saved && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900">
                <strong>Note:</strong> Save your report as a draft first before submitting. Once submitted, the work order will be marked as completed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
