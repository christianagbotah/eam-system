import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/factorymanager/public/api/v1';

export interface PMTemplate {
  id: number;
  code: string;
  title: string;
  description: string;
  asset_node_type: 'machine' | 'assembly' | 'part' | 'subpart';
  asset_node_id: number;
  maintenance_type: 'inspection' | 'lubrication' | 'replace' | 'clean' | 'calibration' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_hours: number;
  active: boolean;
  triggers?: PMTrigger[];
  checklists?: PMChecklist[];
}

export interface PMTrigger {
  id?: number;
  trigger_type: 'time' | 'usage' | 'production' | 'event';
  period_days?: number;
  usage_meter_id?: number;
  usage_threshold?: number;
  production_metric?: string;
  event_name?: string;
}

export interface PMChecklist {
  id?: number;
  title: string;
  sequence: number;
  items: PMChecklistItem[];
}

export interface PMChecklistItem {
  id?: number;
  item_text: string;
  item_type: 'yesno' | 'passfail' | 'numeric' | 'text' | 'photo';
  required: boolean;
  sequence: number;
}

export interface PMSchedule {
  id: number;
  pm_template_id: number;
  title: string;
  description: string;
  next_due_date?: string;
  next_due_usage?: number;
  status: 'waiting' | 'generated' | 'assigned' | 'in_progress' | 'completed' | 'closed' | 'overdue';
  priority: string;
  maintenance_type: string;
}

class PMService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return { Authorization: `Bearer ${token}` };
  }

  async listTemplates(filters?: { active?: boolean; asset_node_type?: string; maintenance_type?: string; priority?: string }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const response = await axios.get(`${API_BASE}/pm/templates?${params}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getTemplate(id: number) {
    const response = await axios.get(`${API_BASE}/pm/templates/${id}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async createTemplate(template: Partial<PMTemplate>) {
    const response = await axios.post(`${API_BASE}/pm/templates`, template, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateTemplate(id: number, template: Partial<PMTemplate>) {
    const response = await axios.put(`${API_BASE}/pm/templates/${id}`, template, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async activateTemplate(id: number) {
    const response = await axios.post(`${API_BASE}/pm/templates/${id}/activate`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async deactivateTemplate(id: number) {
    const response = await axios.post(`${API_BASE}/pm/templates/${id}/deactivate`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async listSchedules(filters?: { status?: string; asset_id?: number; from?: string; to?: string }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    
    const response = await axios.get(`${API_BASE}/pm/schedules?${params}`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async generateWorkOrder(scheduleId: number) {
    const response = await axios.post(`${API_BASE}/pm/schedules/${scheduleId}/generate-workorder`, {}, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async updateSchedule(id: number, data: { status?: string; comment?: string; next_due_date?: string }) {
    const response = await axios.put(`${API_BASE}/pm/schedules/${id}`, data, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async runScheduler(data: { from?: string; to?: string; date?: string }) {
    const response = await axios.post(`${API_BASE}/pm/run`, data, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async getScheduleHistory(id: number) {
    const response = await axios.get(`${API_BASE}/pm/schedules/${id}/history`, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }

  async bulkGenerateWorkOrders(templateIds: number[]) {
    const response = await axios.post(`${API_BASE}/pm/templates/generate-bulk`, {
      template_ids: templateIds
    }, {
      headers: this.getAuthHeaders()
    });
    return response.data;
  }
}

export const pmService = new PMService();
