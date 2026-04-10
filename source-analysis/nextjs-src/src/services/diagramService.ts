import { api } from '@/lib/api';

export interface MachineHierarchy {
  id: number;
  name: string;
  type: 'machine' | 'assembly' | 'part';
  children?: MachineHierarchy[];
  code?: string;
  parent_id?: number;
}

export interface DiagramData {
  machine: any;
  model?: any;
  hierarchy: MachineHierarchy;
  hotspots: any[];
}

class DiagramService {
  private baseUrl = '/api/v1';

  async getMachineHierarchy(machineId: number): Promise<MachineHierarchy> {
    const response = await api.get(`${this.baseUrl}/assets/machines/${machineId}/hierarchy`);
    return response.data;
  }

  async getDiagramData(machineId: number): Promise<DiagramData> {
    const response = await api.get(`${this.baseUrl}/assets/machines/${machineId}/diagram`);
    return response.data;
  }

  async assignPMTask(data: {
    hotspot_id: number;
    pm_template_id: number;
    frequency_days: number;
    priority?: string;
    assigned_technician_id?: number;
    notes?: string;
  }): Promise<{ task_id: number }> {
    const response = await api.post(`${this.baseUrl}/models/pm/assign-task`, data);
    return response.data;
  }

  async getNodeTasks(nodeType: string, nodeId: number): Promise<{ tasks: any[] }> {
    const response = await api.get(`${this.baseUrl}/models/pm/node-tasks/${nodeType}/${nodeId}`);
    return response.data;
  }

  async getPMTemplates(): Promise<{ templates: any[] }> {
    const response = await api.get(`${this.baseUrl}/models/pm/templates`);
    return response.data;
  }

  async autoMapHierarchy(machineId: number, modelId: number): Promise<any> {
    const response = await api.post(`${this.baseUrl}/models/auto-map`, {
      machine_id: machineId,
      model_id: modelId
    });
    return response.data;
  }

  async createMappingOverride(data: {
    model_id: number;
    node_type: string;
    node_id: number;
    mesh_name?: string;
    coordinates?: { x: number; y: number; z?: number };
  }): Promise<{ hotspot_id: number }> {
    const response = await api.post(`${this.baseUrl}/models/mapping-override`, data);
    return response.data;
  }
}

export const diagramService = new DiagramService();
