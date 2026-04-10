import api from './api';

export interface SurveySignature {
  signature_id?: number;
  survey_id: number;
  user_id: number;
  signature_type: 'operator' | 'supervisor' | 'manager' | 'quality';
  signature_data: string;
  signature_method?: 'drawn' | 'typed' | 'uploaded' | 'biometric';
  signed_at?: string;
}

export interface SurveyTemplate {
  template_id?: number;
  template_code?: string;
  template_name: string;
  description?: string;
  machine_type?: string;
  template_data: any;
  field_config?: any;
  validation_rules?: any;
  is_active?: boolean;
}

export interface CAPA {
  capa_id?: number;
  capa_code?: string;
  survey_id: number;
  capa_type: 'corrective' | 'preventive';
  issue_description: string;
  root_cause?: string;
  action_plan: string;
  responsible_user_id: number;
  due_date: string;
  status?: 'open' | 'in_progress' | 'completed' | 'verified' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SurveySchedule {
  schedule_id?: number;
  schedule_name: string;
  template_id?: number;
  machine_id?: number;
  shift_id?: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'per_shift' | 'custom';
  frequency_value?: number;
  start_date: string;
  end_date?: string;
  auto_create?: boolean;
  auto_assign_user_id?: number;
  is_active?: boolean;
}

export interface BatchOperation {
  operation_type: 'approve' | 'reject' | 'export' | 'update' | 'delete';
  survey_ids: number[];
  parameters?: any;
}

export const productionSurveyAdvancedService = {
  // Signatures
  addSignature: (surveyId: number, data: Partial<SurveySignature>) =>
    api.post(`/production-surveys/${surveyId}/signatures`, data),
  
  validateSignatures: (surveyId: number) =>
    api.post(`/production-surveys/${surveyId}/signatures/validate`),

  // Templates
  getTemplates: () => api.get('/production-surveys/templates'),
  createTemplate: (data: SurveyTemplate) => api.post('/production-surveys/templates', data),
  applyTemplate: (templateId: number, surveyData: any) =>
    api.post(`/production-surveys/templates/${templateId}/apply`, surveyData),

  // Audit Trail
  getAuditTrail: (surveyId: number) =>
    api.get(`/production-surveys/${surveyId}/audit-trail`),

  // CAPA
  getCAPAs: (surveyId: number) => api.get(`/production-surveys/${surveyId}/capa`),
  createCAPA: (surveyId: number, data: CAPA) =>
    api.post(`/production-surveys/${surveyId}/capa`, data),
  getAllCAPAs: () => api.get('/production-surveys/capa'),

  // Scheduling
  getSchedules: () => api.get('/production-surveys/schedules'),
  createSchedule: (data: SurveySchedule) => api.post('/production-surveys/schedules', data),
  generateScheduled: () => api.post('/production-surveys/schedules/generate'),

  // Batch Operations
  batchOperation: (data: BatchOperation) => api.post('/production-surveys/batch', data),
  getBatchStatus: (batchId: number) => api.get(`/production-surveys/batch/${batchId}`),

  // Analytics
  detectAnomalies: (surveyId: number) =>
    api.post(`/production-surveys/${surveyId}/anomalies/detect`),
  getAnomalies: (surveyId: number) =>
    api.get(`/production-surveys/${surveyId}/anomalies`),
};
