import api from '@/lib/api';
import type {
  Machine,
  Assembly,
  Part,
  BOMEntry,
  PartMedia,
  Meter,
  ApiResponse,
  MachineFormData,
  AssemblyFormData,
  PartFormData,
  MeterFormData,
  AssetFilters
} from '@/types/asset';

class AssetService {
  // Machine CRUD operations
  async getMachines(filters?: AssetFilters): Promise<Machine[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const url = `/assets/machines${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get<ApiResponse<Machine[]>>(url);
    return response.data.data;
  }

  async getMachine(id: number | string): Promise<Machine> {
    const response = await api.get<ApiResponse<Machine>>(`/assets/machines/${id}`);
    return response.data.data;
  }

  async createMachine(data: MachineFormData): Promise<Machine> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    const response = await api.post<ApiResponse<Machine>>('/assets/machines', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  }

  async updateMachine(id: number | string, data: Partial<MachineFormData>): Promise<Machine> {
    const response = await api.put<ApiResponse<Machine>>(`/assets/machines/${id}`, data);
    return response.data.data;
  }

  async deleteMachine(id: number | string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/assets/machines/${id}`);
    return response.data;
  }

  // Assembly CRUD operations
  async getAssemblies(machineId?: number | string, filters?: AssetFilters): Promise<Assembly[]> {
    const params = new URLSearchParams();
    if (machineId) params.append('equipment_id', machineId.toString());
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    const url = `/assemblies${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get<ApiResponse<Assembly[]>>(url);
    return response.data.data;
  }

  async getAssembly(id: number | string): Promise<Assembly> {
    const response = await api.get<ApiResponse<Assembly>>(`/assemblies/${id}`);
    return response.data.data;
  }

  async createAssembly(data: AssemblyFormData): Promise<Assembly> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    const response = await api.post<ApiResponse<Assembly>>('/assemblies', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  }

  async updateAssembly(id: number | string, data: Partial<AssemblyFormData>): Promise<Assembly> {
    const response = await api.put<ApiResponse<Assembly>>(`/assemblies/${id}`, data);
    return response.data.data;
  }

  async deleteAssembly(id: number | string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/assemblies/${id}`);
    return response.data;
  }

  // Part CRUD operations
  async getParts(filters?: { machine_id?: number | string; assembly_id?: number | string } & AssetFilters): Promise<Part[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          // Map frontend field names to database field names
          const dbKey = key === 'assembly_id' ? 'component_id' : key;
          params.append(dbKey, value.toString());
        }
      });
    }
    const url = `/parts${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get<ApiResponse<Part[]>>(url);
    return response.data.data;
  }

  async getPart(id: number | string): Promise<Part> {
    const response = await api.get<ApiResponse<Part>>(`/parts/${id}`);
    return response.data.data;
  }

  async createPart(data: PartFormData): Promise<Part> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value.toString());
        }
      }
    });
    const response = await api.post<ApiResponse<Part>>('/parts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  }

  async updatePart(id: number | string, data: Partial<PartFormData>): Promise<Part> {
    const response = await api.put<ApiResponse<Part>>(`/parts/${id}`, data);
    return response.data.data;
  }

  async deletePart(id: number | string): Promise<ApiResponse<null>> {
    const response = await api.delete<ApiResponse<null>>(`/parts/${id}`);
    return response.data;
  }

  // Asset Tree
  async getAssetTree(machineId: number | string): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/assets/tree/${machineId}`);
    return response.data.data;
  }

  // BOM operations
  async getBOMEntries(machineId: number | string): Promise<BOMEntry[]> {
    const response = await api.get<ApiResponse<BOMEntry[]>>(`/assets/bom?machine_id=${machineId}`);
    return response.data.data;
  }

  async createBOMEntry(data: Omit<BOMEntry, 'id' | 'created_at'>): Promise<BOMEntry> {
    const response = await api.post<ApiResponse<BOMEntry>>('/assets/bom', data);
    return response.data.data;
  }

  async importBOM(machineId: number | string, file: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('machine_id', machineId.toString());
    const response = await api.post<ApiResponse<any>>('/assets/bom/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async exportBOM(machineId: number | string): Promise<any> {
    const response = await api.get(`/assets/bom/export?machine_id=${machineId}`);
    return response.data;
  }

  // Media operations
  async uploadPartMedia(partId: number | string, file: File, type: 'image' | 'diagram' | '3d_model' | 'document' = 'image'): Promise<PartMedia> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const response = await api.post<ApiResponse<PartMedia>>(`/assets/parts/${partId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
  }

  async getPartMedia(partId: number | string): Promise<PartMedia[]> {
    const response = await api.get<ApiResponse<PartMedia[]>>(`/assets/parts/${partId}/media`);
    return response.data.data;
  }

  // Meter operations
  async getMeters(assetType?: 'machine' | 'assembly' | 'part', assetId?: number | string): Promise<Meter[]> {
    const params = new URLSearchParams();
    if (assetType) params.append('asset_type', assetType);
    if (assetId) params.append('asset_id', assetId.toString());
    const url = `/assets/meters${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await api.get<ApiResponse<Meter[]>>(url);
    return response.data.data;
  }

  async createMeter(data: MeterFormData): Promise<Meter> {
    const response = await api.post<ApiResponse<Meter>>('/assets/meters', data);
    return response.data.data;
  }

  async updateMeterReading(meterId: number | string, value: number): Promise<Meter> {
    const response = await api.put<ApiResponse<Meter>>(`/assets/meters/${meterId}/reading`, { value });
    return response.data.data;
  }
}

export default new AssetService();
