import { api } from '@/lib/api';

export interface ModelData {
  id: string;
  machine_id: number;
  model_type: 'glb' | 'gltf' | 'svg';
  file_path: string;
  optimized_file_path?: string;
  thumbnail_path?: string;
  file_size?: number;
  version?: number;
  uploader_id?: number;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  metadata_json?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Hotspot {
  id?: string;
  model_id: string;
  node_type: 'machine' | 'assembly' | 'part';
  node_id: number;
  label: string;
  shape: 'circle' | 'rect' | 'poly';
  coords?: { x: number; y: number; width?: number; height?: number; points?: number[] };
  mesh_name?: string;
  world_coords?: { x: number; y: number; z: number };
  metadata?: any;
  created_by?: number;
  x?: number;
  y?: number;
  z?: number;
  node_data?: any;
}

export interface ModelLayer {
  id: string;
  model_id: string;
  name: string;
  order_index: number;
  visible_default: boolean;
  metadata?: any;
  layer_name?: string;
  layer_order?: number;
  color?: string;
  opacity?: number;
}

export interface MeshMapping {
  id?: string;
  part_id: number;
  model_id: string;
  mesh_name: string;
  mapping_confidence: number;
  part_name?: string;
  part_code?: string;
  metadata?: any;
}

export interface Part {
  id: number;
  name: string;
  code: string;
  description?: string;
}

// Legacy interface for backward compatibility
export interface MachineModel extends ModelData {
  hotspots?: Hotspot[];
  layers?: ModelLayer[];
}

export interface ViewState {
  camera_position?: [number, number, number];
  camera_target?: [number, number, number];
  zoom_level?: number;
  layer_visibility?: Record<number, boolean>;
}

export interface NavigationPath {
  machine_id?: number;
  assembly_id?: number;
  part_id?: number;
  subpart_id?: number;
}

class ModelService {
  private baseUrl = '/api/v1/models';

  // Model Management
  async uploadModel(
    machineId: number, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<{ model_id: string; processing_job_id?: string; model_type: string }> {
    const formData = new FormData();
    formData.append('machine_id', machineId.toString());
    formData.append('model_file', file);

    const response = await api.post(`${this.baseUrl}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    
    return response.data;
  }

  async getModelsByMachine(machineId: number): Promise<ModelData[]> {
    const response = await api.get(`${this.baseUrl}/machine/${machineId}`);
    return response.data;
  }

  async getModel(modelId: string): Promise<ModelData> {
    const response = await api.get(`${this.baseUrl}/${modelId}`);
    return response.data;
  }

  async getViewerData(modelId: string): Promise<{
    model: ModelData;
    hotspots: Hotspot[];
    layers: ModelLayer[];
  }> {
    const response = await api.get(`${this.baseUrl}/${modelId}/viewer-data`);
    return response.data;
  }

  async deleteModel(modelId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${modelId}`);
  }

  async getModelFile(modelId: string): Promise<string> {
    const response = await api.get(`${this.baseUrl}/${modelId}/file`, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  }

  async parseModel(modelId: string): Promise<{ mesh_names: string[]; model_type: string }> {
    const response = await api.get(`${this.baseUrl}/${modelId}/parse`);
    return response.data;
  }

  async getProcessingStatus(jobId: string): Promise<{ status: string; logs?: string }> {
    const response = await api.get(`/api/v1/processing-jobs/${jobId}`);
    return response.data;
  }

  // Hotspot Management
  async createHotspot(hotspotData: Partial<Hotspot>): Promise<string> {
    const response = await api.post(`${this.baseUrl}/hotspots`, hotspotData);
    return response.data.hotspot_id;
  }

  async getHotspots(modelId: string): Promise<Hotspot[]> {
    const response = await api.get(`${this.baseUrl}/${modelId}/hotspots`);
    return response.data;
  }

  async updateHotspot(hotspotId: string, data: Partial<Hotspot>): Promise<void> {
    await api.put(`${this.baseUrl}/hotspots/${hotspotId}`, data);
  }

  async deleteHotspot(hotspotId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/hotspots/${hotspotId}`);
  }

  async bulkCreateHotspots(hotspots: Partial<Hotspot>[]): Promise<string[]> {
    const response = await api.post(`${this.baseUrl}/hotspots/bulk`, hotspots);
    return response.data.created_ids;
  }

  async autoGenerateHotspots(modelId: string, meshNames: string[]): Promise<string[]> {
    const response = await api.post(`${this.baseUrl}/hotspots/auto-generate`, {
      model_id: modelId,
      mesh_names: meshNames
    });
    return response.data.created_ids;
  }

  async getHotspotNavigation(hotspotId: string): Promise<any[]> {
    const response = await api.get(`${this.baseUrl}/hotspots/${hotspotId}/navigation`);
    return response.data;
  }

  // Layer Management
  async updateLayerVisibility(modelId: string, layerVisibility: Record<string, boolean>): Promise<void> {
    await api.put(`${this.baseUrl}/${modelId}/layers`, layerVisibility);
  }

  async getLayersByModel(modelId: string): Promise<ModelLayer[]> {
    const response = await api.get(`${this.baseUrl}/${modelId}/layers`);
    return response.data;
  }

  // View State Management
  async saveViewState(modelId: string, viewState: any): Promise<void> {
    await api.post(`${this.baseUrl}/${modelId}/view-state`, viewState);
  }

  async syncViewState(modelId: string, viewState: any): Promise<void> {
    await api.post(`${this.baseUrl}/${modelId}/sync-view`, viewState);
  }

  async getViewHistory(modelId: string): Promise<any[]> {
    const response = await api.get(`${this.baseUrl}/${modelId}/view-history`);
    return response.data;
  }

  // Mesh-to-Part Mapping
  async mapMeshToPart(modelId: string, meshName: string, partId: number, confidence: number = 1.0): Promise<string> {
    const response = await api.post(`${this.baseUrl}/mappings`, {
      model_id: modelId,
      mesh_name: meshName,
      part_id: partId,
      mapping_confidence: confidence
    });
    return response.data.mapping_id;
  }

  async autoMapMeshesToParts(modelId: string, meshNames: string[]): Promise<string[]> {
    const response = await api.post(`${this.baseUrl}/mappings/auto-map`, {
      model_id: modelId,
      mesh_names: meshNames
    });
    return response.data.created_ids;
  }

  async getMappings(modelId: string): Promise<MeshMapping[]> {
    const response = await api.get(`${this.baseUrl}/${modelId}/mappings`);
    return response.data;
  }

  async updateMapping(mappingId: string, data: Partial<MeshMapping>): Promise<void> {
    await api.put(`${this.baseUrl}/mappings/${mappingId}`, data);
  }

  async deleteMapping(mappingId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/mappings/${mappingId}`);
  }

  async getAvailableParts(): Promise<Part[]> {
    const response = await api.get(`${this.baseUrl}/parts/search`);
    return response.data;
  }

  async getAllModels(): Promise<ModelData[]> {
    const response = await api.get(`${this.baseUrl}/all`);
    return response.data;
  }

  async getModelStats(): Promise<any> {
    const response = await api.get(`${this.baseUrl}/stats`);
    return response.data;
  }

  async searchParts(query: string): Promise<Part[]> {
    const response = await api.get(`${this.baseUrl}/parts/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  async getMeshNames(modelId: string): Promise<string[]> {
    const parseData = await this.parseModel(modelId);
    return parseData.mesh_names;
  }

  // PM Integration
  async assignPMTask(taskData: {
    asset_node_type?: string;
    asset_node_id?: number;
    pm_template_id: string;
    frequency_type?: string;
    frequency_value?: number;
    priority?: string;
    notes?: string;
  }): Promise<void> {
    await api.post(`${this.baseUrl}/pm/assign-task`, taskData);
  }

  async getNodeTasks(nodeType: string, nodeId: number): Promise<any[]> {
    const response = await api.get(`${this.baseUrl}/pm/node-tasks/${nodeType}/${nodeId}`);
    return response.data;
  }

  async getAvailableTemplates(): Promise<any[]> {
    const response = await api.get(`${this.baseUrl}/pm/templates`);
    return response.data;
  }

  // Utility Methods
  getModelFileUrl(modelId: string): string {
    return `${this.baseUrl}/${modelId}/file`;
  }

  getThumbnailUrl(thumbnailPath: string): string {
    return `/api/uploads/${thumbnailPath}`;
  }

  // Model Type Detection
  isGLTFModel(filename: string): boolean {
    return filename.toLowerCase().endsWith('.glb') || filename.toLowerCase().endsWith('.gltf');
  }

  // Mesh Highlighting
  highlightMesh(mesh: any, highlight: boolean, color: string = '#0066ff'): void {
    if (!mesh || !mesh.material) return;
    
    if (highlight) {
      mesh.material = mesh.material.clone();
      mesh.material.emissive = new (window as any).THREE.Color(color);
      mesh.material.emissiveIntensity = 0.3;
    } else {
      mesh.material.emissive = new (window as any).THREE.Color(0x000000);
      mesh.material.emissiveIntensity = 0;
    }
  }

  // Camera Focus
  focusCameraOnMesh(mesh: any, camera: any, controls: any): void {
    if (!mesh) return;
    
    const box = new (window as any).THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new (window as any).THREE.Vector3());
    const size = box.getSize(new (window as any).THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;
    
    camera.position.copy(center);
    camera.position.z += distance;
    camera.lookAt(center);
    
    if (controls) {
      controls.target.copy(center);
      controls.update();
    }
  }

  isSVGModel(filename: string): boolean {
    return filename.toLowerCase().endsWith('.svg');
  }

  isImageModel(filename: string): boolean {
    const imageExtensions = ['.png', '.jpg', '.jpeg'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  // Coordinate Conversion
  convertScreenToModel(screenX: number, screenY: number, containerWidth: number, containerHeight: number): { x: number; y: number } {
    return {
      x: (screenX / containerWidth) * 100,
      y: (screenY / containerHeight) * 100
    };
  }

  convert3DToScreen(position: [number, number, number], camera: any, renderer: any): { x: number; y: number } {
    // Convert 3D world position to screen coordinates
    const vector = new (window as any).THREE.Vector3(...position);
    vector.project(camera);
    
    const widthHalf = renderer.domElement.width / 2;
    const heightHalf = renderer.domElement.height / 2;
    
    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    };
  }

  convertModelToScreen(modelX: number, modelY: number, containerWidth: number, containerHeight: number): { x: number; y: number } {
    return {
      x: (modelX / 100) * containerWidth,
      y: (modelY / 100) * containerHeight
    };
  }

  // 3D Viewer Utilities
  highlightMesh(meshName: string, color: string = '#ff6b6b'): void {
    console.log(`Highlighting mesh: ${meshName} with color: ${color}`);
  }

  focusOnMesh(meshName: string): void {
    console.log(`Focusing on mesh: ${meshName}`);
  }

  explodeView(enabled: boolean, factor: number = 1.5): void {
    console.log(`Exploded view: ${enabled ? 'enabled' : 'disabled'} with factor: ${factor}`);
  }

  // Coordinate Conversion Utilities
  worldToScreen(worldCoords: { x: number; y: number; z: number }): { x: number; y: number } {
    return {
      x: worldCoords.x * 100,
      y: worldCoords.y * 100
    };
  }

  screenToWorld(screenCoords: { x: number; y: number }, depth: number = 0): { x: number; y: number; z: number } {
    return {
      x: screenCoords.x / 100,
      y: screenCoords.y / 100,
      z: depth
    };
  }

  // Camera Controls
  setCameraPosition(position: { x: number; y: number; z: number }): void {
    console.log(`Setting camera position:`, position);
  }

  setCameraTarget(target: { x: number; y: number; z: number }): void {
    console.log(`Setting camera target:`, target);
  }

  resetCamera(): void {
    console.log('Resetting camera to default position');
  }

  // Validation
  validateHotspotData(data: Partial<Hotspot>): string[] {
    const errors: string[] = [];

    if (!data.label || data.label.trim().length === 0) {
      errors.push('Label is required');
    }

    if (!data.node_type || !['machine', 'assembly', 'part'].includes(data.node_type)) {
      errors.push('Valid node type is required');
    }

    if (!data.node_id || data.node_id <= 0) {
      errors.push('Valid node ID is required');
    }

    return errors;
  }

  validateModelFile(file: File): string[] {
    const errors: string[] = [];
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedExtensions = ['.glb', '.gltf', '.svg', '.zip'];
    
    if (file.size > maxSize) {
      errors.push(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
    }

    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
    }

    return errors;
  }
}

export const modelService = new ModelService();
export type { ViewState, NavigationPath };
