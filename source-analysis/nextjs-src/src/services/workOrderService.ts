import api from '@/lib/api';
import RWOPWorkOrderService from './RWOP/WorkOrderService';
import AuditService from './RWOP/AuditService';

export interface WorkOrder {
  id: number;
  wo_number: string;
  title: string;
  description?: string;
  asset_id: number;
  asset_name?: string;
  type: string;
  priority: string;
  status: string;
  assigned_user_id?: number;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  sla_hours?: number;
  sla_started_at?: string;
  sla_breached_at?: string;
  version: number;
  total_cost?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderMaterial {
  id: number;
  work_order_id: number;
  inventory_item_id: number;
  part_name: string;
  part_code: string;
  quantity_required: number;
  quantity_reserved: number;
  quantity_issued: number;
  unit_cost: number;
  status: 'required' | 'reserved' | 'issued' | 'returned';
}

export interface WorkOrderAttachment {
  id: number;
  work_order_id: number;
  filename: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface WorkOrderLog {
  id: number;
  work_order_id: number;
  user_id: number;
  username?: string;
  action: string;
  old_status?: string;
  new_status?: string;
  notes?: string;
  created_at: string;
}

class WorkOrderService {
  async getWorkOrders(filters?: any) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });
    }
    const response = await api.get(`/work-orders?${params}`);
    return response.data;
  }

  async getAll(filters?: any): Promise<WorkOrder[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value as string);
      });
    }
    const response = await api.get(`/work-orders?${params}`);
    return response.data.data;
  }

  async getById(id: number | string): Promise<WorkOrder> {
    const response = await api.get(`/work-orders/${id}`);
    return response.data.data;
  }

  async create(data: Partial<WorkOrder>): Promise<WorkOrder> {
    const response = await api.post('/work-orders', data);
    return response.data.data;
  }

  async update(id: number | string, data: Partial<WorkOrder>): Promise<WorkOrder> {
    const response = await api.put(`/work-orders/${id}`, data);
    return response.data.data;
  }

  async assign(id: number | string, userId: number): Promise<WorkOrder> {
    const response = await api.post(`/work-orders/${id}/assign`, {
      assigned_user_id: userId
    });
    return response.data.data;
  }

  async assignToSupervisor(id: number | string, supervisorId: number): Promise<any> {
    const response = await api.post(`/work-orders/${id}/assign-supervisor`, {
      supervisor_id: supervisorId
    });
    return response.data;
  }

  async assignToTechnician(id: number | string, technicianId: number): Promise<any> {
    const response = await api.post(`/work-orders/${id}/assign-technician`, {
      technician_id: technicianId
    });
    return response.data;
  }

  async start(id: number | string): Promise<WorkOrder> {
    const response = await api.post(`/work-orders/${id}/start`);
    return response.data.data;
  }

  async complete(id: number | string, data?: any, currentUserId?: number, overrideReason?: string): Promise<WorkOrder> {
    // CRITICAL: Delegate to RWOP service for enforcement
    if (currentUserId) {
      try {
        const result = await RWOPWorkOrderService.completeWorkOrder(id, data, currentUserId, overrideReason);
        return result.data;
      } catch (error) {
        if (error instanceof Error && error.message.includes('UNAUTHORIZED')) {
          throw new Error('HTTP_403: ' + error.message);
        }
        throw error;
      }
    }
    
    // Fallback for backward compatibility
    const response = await api.post(`/work-orders/${id}/complete`, data);
    return response.data.data;
  }

  async pause(id: number | string, reason: string): Promise<WorkOrder> {
    const response = await api.post(`/work-orders/${id}/pause`, { reason });
    return response.data.data;
  }

  async reopen(id: number | string, reason: string): Promise<WorkOrder> {
    const response = await api.post(`/work-orders/${id}/reopen`, { reason });
    return response.data.data;
  }

  async getMaterials(id: number | string): Promise<WorkOrderMaterial[]> {
    const response = await api.get(`/work-orders/${id}/materials`);
    return response.data.data;
  }

  async addMaterial(id: number | string, data: any): Promise<WorkOrderMaterial> {
    const response = await api.post(`/work-orders/${id}/materials`, data);
    return response.data.data;
  }

  async issueMaterial(woId: number | string, materialId: number, quantity: number): Promise<void> {
    await api.post(`/work-orders/${woId}/materials/${materialId}/issue`, { quantity });
  }

  async getAttachments(id: number | string): Promise<WorkOrderAttachment[]> {
    const response = await api.get(`/work-orders/${id}/attachments`);
    return response.data.data;
  }

  async uploadAttachments(id: number | string, files: FileList): Promise<WorkOrderAttachment[]> {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files[]', file);
    });
    const response = await api.post(`/work-orders/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  }

  async getHistory(id: number | string): Promise<WorkOrderLog[]> {
    const response = await api.get(`/work-orders/${id}/history`);
    return response.data.data;
  }

  async getSLAStatus(id: number | string): Promise<any> {
    const response = await api.get(`/work-orders/${id}/sla-status`);
    return response.data.data;
  }

  async getAvailableTechnicians(id: number | string): Promise<any[]> {
    const response = await api.get(`/work-orders/${id}/available-technicians`);
    return response.data.data;
  }
}

export default new WorkOrderService();
