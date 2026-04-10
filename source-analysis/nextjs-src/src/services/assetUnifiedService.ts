import api from '@/lib/api';

export interface AssetUnified {
  id: number;
  asset_code: string;
  asset_name: string;
  asset_type: 'facility' | 'building' | 'system' | 'line' | 'equipment' | 'machine' | 'assembly' | 'component' | 'part' | 'subpart';
  parent_id?: number;
  hierarchy_level: number;
  hierarchy_path: string;
  manufacturer?: string;
  model_number?: string;
  serial_number?: string;
  installation_date?: string;
  status: 'active' | 'idle' | 'maintenance' | 'down' | 'retired';
  criticality: 'low' | 'medium' | 'high' | 'critical';
  health_score?: number;
  location_id?: number;
  department_id?: number;
  mtbf_hours?: number;
  mttr_hours?: number;
  oee_percent?: number;
  acquisition_cost?: number;
  model_3d_id?: number;
  tags?: string[];
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
  children?: AssetUnified[];
  ancestors?: AssetUnified[];
  bom?: BOMItem[];
}

export interface BOMItem {
  id: number;
  parent_asset_id: number;
  child_asset_id: number;
  quantity: number;
  unit: string;
  position?: number;
  is_critical: boolean;
  is_consumable: boolean;
  lead_time_days?: number;
  unit_cost?: number;
  supplier_id?: number;
  installation_time_minutes?: number;
  notes?: string;
  asset_code?: string;
  asset_name?: string;
  asset_type?: string;
  status?: string;
}

export interface AssetFilters {
  type?: string;
  status?: string;
  criticality?: string;
  search?: string;
}

class AssetUnifiedService {
  private baseUrl = '/assets-unified';

  // Get all assets with filters
  async getAssets(filters?: AssetFilters): Promise<AssetUnified[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.criticality) params.append('criticality', filters.criticality);
    if (filters?.search) params.append('search', filters.search);

    const response = await api.get(`${this.baseUrl}?${params.toString()}`);
    return response.data.data;
  }

  // Get single asset
  async getAsset(id: number, include?: string[]): Promise<AssetUnified> {
    const params = include ? `?include=${include.join(',')}` : '';
    const response = await api.get(`${this.baseUrl}/${id}${params}`);
    return response.data.data;
  }

  // Create asset
  async createAsset(data: Partial<AssetUnified>): Promise<AssetUnified> {
    const response = await api.post(this.baseUrl, data);
    return response.data.data;
  }

  // Update asset
  async updateAsset(id: number, data: Partial<AssetUnified>): Promise<AssetUnified> {
    const response = await api.put(`${this.baseUrl}/${id}`, data);
    return response.data.data;
  }

  // Delete asset
  async deleteAsset(id: number): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // Get asset tree
  async getTree(rootId?: number, depth?: number): Promise<AssetUnified | AssetUnified[]> {
    const url = rootId ? `${this.baseUrl}/${rootId}/tree` : `${this.baseUrl}/tree`;
    const params = depth ? `?depth=${depth}` : '';
    const response = await api.get(`${url}${params}`);
    return response.data.data;
  }

  // Get asset hierarchy (ancestors + descendants)
  async getHierarchy(id: number): Promise<{
    asset: AssetUnified;
    ancestors: AssetUnified[];
    descendants: AssetUnified[];
  }> {
    const response = await api.get(`${this.baseUrl}/${id}/hierarchy`);
    return response.data.data;
  }

  // Get BOM
  async getBOM(id: number, explode = false): Promise<BOMItem[]> {
    const params = explode ? '?explode=true' : '';
    const response = await api.get(`${this.baseUrl}/${id}/bom${params}`);
    return response.data.data;
  }

  // Add BOM item
  async addBOMItem(parentId: number, data: Partial<BOMItem>): Promise<BOMItem[]> {
    const response = await api.post(`${this.baseUrl}/${parentId}/bom`, data);
    return response.data.data;
  }

  // Get where-used
  async getWhereUsed(id: number): Promise<BOMItem[]> {
    const response = await api.get(`${this.baseUrl}/${id}/where-used`);
    return response.data.data;
  }

  // Search assets
  async searchAssets(term: string, filters?: AssetFilters): Promise<AssetUnified[]> {
    return this.getAssets({ ...filters, search: term });
  }

  // Get critical assets
  async getCriticalAssets(): Promise<AssetUnified[]> {
    return this.getAssets({ criticality: 'critical' });
  }

  // Get assets by type
  async getAssetsByType(type: string): Promise<AssetUnified[]> {
    return this.getAssets({ type });
  }

  // Get assets by status
  async getAssetsByStatus(status: string): Promise<AssetUnified[]> {
    return this.getAssets({ status });
  }
}

export default new AssetUnifiedService();
