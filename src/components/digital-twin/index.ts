'use client';

// ============================================================================
// Digital Twin 3D Viewer Components — Barrel Export
// ============================================================================

// Main pages
export { DigitalTwinMainPage, default } from './DigitalTwinMainPage';
export { SystemDiagramPage } from './SystemDiagramPage';

// Main viewer (orchestrator)
export { DigitalTwinViewer, type DigitalTwinViewerProps } from './DigitalTwinViewer';

// 3D scene components (rendered inside Canvas)
export { SceneLighting, type SceneLightingProps } from './SceneLighting';
export { GroundPlane, type GroundPlaneProps } from './GroundPlane';
export { ModelLoader, type ModelLoaderProps } from './ModelLoader';
export { InteractiveMesh, type InteractiveMeshProps, type AssetMeshBinding } from './InteractiveMesh';
export { IoTOverlayLayer, type IoTOverlayLayerProps } from './IoTOverlayLayer';
export { SectionPlane, type SectionPlaneProps } from './SectionPlane';
export { ExplodedView, type ExplodedViewProps } from './ExplodedView';
export { HotspotLayer, type HotspotLayerProps } from './HotspotLayer';
export { AnnotationLayer, type AnnotationLayerProps } from './AnnotationLayer';

// UI overlay panels (rendered outside Canvas, positioned absolute)
export { TwinToolbar, type TwinToolbarProps } from './TwinToolbar';
export { SceneTreePanel, type SceneTreePanelProps } from './SceneTreePanel';
export { ComponentInfoPanel, type ComponentInfoPanelProps } from './ComponentInfoPanel';

// Diagram components
export { DiagramTemplates } from './DiagramTemplates';
export { nodeTypes, edgeTypes } from './DiagramNodeTypes';
