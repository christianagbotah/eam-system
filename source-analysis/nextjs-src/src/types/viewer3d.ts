export interface ViewerState {
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    zoom: number;
  };
  selectedMeshId: string | null;
  highlightedMeshId: string | null;
  explodedView: boolean;
  explodeDistance: number;
  visibleLayers: string[];
  hotspots: Hotspot[];
}

export interface Hotspot {
  id: number;
  asset_id: number;
  mesh_id: string;
  position_x: number;
  position_y: number;
  position_z: number;
  tooltip_text: string;
  hotspot_type: 'info' | 'warning' | 'maintenance' | 'part';
  is_active: boolean;
}

export interface MeshData {
  id: string;
  name: string;
  geometry: any;
  material: any;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  layer: string;
  parentId?: string;
  children?: string[];
}

export interface TreeNode {
  id: string;
  name: string;
  type: 'machine' | 'assembly' | 'part';
  meshId?: string;
  children?: TreeNode[];
  expanded?: boolean;
  selected?: boolean;
  highlighted?: boolean;
}

export interface ViewerEvents {
  onMeshClick: (meshId: string) => void;
  onMeshHover: (meshId: string | null) => void;
  onCameraChange: (camera: ViewerState['camera']) => void;
  onHotspotClick: (hotspot: Hotspot) => void;
}

export interface ViewerControls {
  selectMesh: (meshId: string) => void;
  highlightMesh: (meshId: string | null) => void;
  setCameraPosition: (position: [number, number, number], target: [number, number, number]) => void;
  setExplodedView: (exploded: boolean, distance?: number) => void;
  toggleLayer: (layer: string, visible: boolean) => void;
  resetView: () => void;
  fitToView: () => void;
}
