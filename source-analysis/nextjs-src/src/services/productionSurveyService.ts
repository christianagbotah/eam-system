import api from '@/lib/api';

export interface ProductionSurvey {
  id?: number;
  survey_code?: string;
  machine_id: number;
  assembly_id?: number;
  part_id?: number;
  work_order_id?: number;
  operator_id?: number;
  supervisor_id?: number;
  shift: 'Day' | 'Night';
  date: string;
  start_time: string;
  end_time: string;
  runtime_minutes?: number;
  downtime_minutes: number;
  downtime_reason?: string;
  material_consumed?: Array<{item_id: number; qty_used: number; unit: string}>;
  defects_count: number;
  defect_types?: string[];
  units_produced?: number;
  cycles_completed?: number;
  trigger_pm_check?: boolean;
  comments?: string;
  status?: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  machine_name?: string;
  operator_name?: string;
  supervisor_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SurveyKPIs {
  total_runtime: number;
  total_downtime: number;
  total_defects: number;
  oee_availability: number;
  defect_rate: number;
}

export const productionSurveyService = {
  async getAll(filters?: any) {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/production-surveys?${params}`);
    return response.data;
  },

  async getById(id: number) {
    const response = await api.get(`/production-surveys/${id}`);
    return response.data;
  },

  async create(data: ProductionSurvey) {
    const response = await api.post('/production-surveys', data);
    return response.data;
  },

  async update(id: number, data: ProductionSurvey) {
    const response = await api.put(`/production-surveys/${id}`, data);
    return response.data;
  },

  async delete(id: number) {
    const response = await api.delete(`/production-surveys/${id}`);
    return response.data;
  },

  async submit(id: number) {
    const response = await api.post(`/production-surveys/${id}/submit`);
    return response.data;
  },

  async approve(id: number) {
    const response = await api.post(`/production-surveys/${id}/approve`);
    return response.data;
  },

  async reject(id: number, reason: string) {
    const response = await api.post(`/production-surveys/${id}/reject`, { reason });
    return response.data;
  },

  async getKPIs(filters?: any) {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/production-surveys/kpis?${params}`);
    return response.data;
  },

  async uploadAttachment(surveyId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/production-surveys/${surveyId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async getAttachments(surveyId: number) {
    const response = await api.get(`/production-surveys/${surveyId}/attachments`);
    return response.data;
  },

  async deleteAttachment(attachmentId: number) {
    const response = await api.delete(`/production-surveys/attachments/${attachmentId}`);
    return response.data;
  }
};
