'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, Text } from '@react-three/drei';
import * as THREE from 'three';

interface Hotspot {
  id: number;
  label: string;
  x: number;
  y: number;
  z: number;
  node_type: 'machine' | 'assembly' | 'part' | 'subpart';
  node_id: number;
  node_data?: any;
  metadata_json?: any;
}

interface ModelLayer {
  id: number;
  layer_name: string;
  layer_order: number;
  visible_default: boolean;
  color?: string;
  opacity?: number;
}

interface InteractiveModelViewerProps {
  modelId: number;
  modelPath: string;
  modelType: '2D' | '3D';
  hotspots: Hotspot[];
  layers: ModelLayer[];
  onHotspotClick?: (hotspot: Hotspot) => void;
  onAssignPMTask?: (hotspot: Hotspot) => void;
  className?: string;
}

// Hotspot component for 3D models
function HotspotMarker({ 
  hotspot, 
  onClick, 
  onAssignPM 
}: { 
  hotspot: Hotspot; 
  onClick: (hotspot: Hotspot) => void;
  onAssignPM: (hotspot: Hotspot) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime;
    }
  });

  return (
    <group position={[hotspot.x * 10, hotspot.y * 10, hotspot.z * 10]}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color={hovered ? '#ff6b6b' : '#4ecdc4'} 
          emissive={hovered ? '#ff6b6b' : '#4ecdc4'}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {(hovered || showMenu) && (
        <Html distanceFactor={10}>
          <div className="bg-white rounded-lg shadow-lg p-3 min-w-[200px] border">
            <div className="font-semibold text-gray-800 mb-2">{hotspot.label}</div>
            <div className="text-sm text-gray-600 mb-3">
              Type: {hotspot.node_type}
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(hotspot);
                  setShowMenu(false);
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                View Details
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignPM(hotspot);
                  setShowMenu(false);
                }}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                Assign PM
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// 3D Model component
function Model3D({ 
  modelPath, 
  hotspots, 
  onHotspotClick, 
  onAssignPM 
}: { 
  modelPath: string;
  hotspots: Hotspot[];
  onHotspotClick: (hotspot: Hotspot) => void;
  onAssignPM: (hotspot: Hotspot) => void;
}) {
  const { scene } = useGLTF(modelPath);
  const { camera } = useThree();

  useEffect(() => {
    // Set up camera position
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      <primitive object={scene} />
      {hotspots.map((hotspot) => (
        <HotspotMarker
          key={hotspot.id}
          hotspot={hotspot}
          onClick={onHotspotClick}
          onAssignPM={onAssignPM}
        />
      ))}
    </>
  );
}

// 2D SVG Viewer component
function SVGViewer({ 
  modelPath, 
  hotspots, 
  onHotspotClick, 
  onAssignPM 
}: {
  modelPath: string;
  hotspots: Hotspot[];
  onHotspotClick: (hotspot: Hotspot) => void;
  onAssignPM: (hotspot: Hotspot) => void;
}) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch(modelPath)
      .then(response => response.text())
      .then(content => setSvgContent(content))
      .catch(console.error);
  }, [modelPath]);

  const handleSVGClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    // Find closest hotspot
    const closest = hotspots.reduce((prev, curr) => {
      const prevDist = Math.sqrt(Math.pow(prev.x - x, 2) + Math.pow(prev.y - y, 2));
      const currDist = Math.sqrt(Math.pow(curr.x - x, 2) + Math.pow(curr.y - y, 2));
      return currDist < prevDist ? curr : prev;
    });

    if (closest) {
      setSelectedHotspot(closest);
    }
  };

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full cursor-pointer"
        dangerouslySetInnerHTML={{ __html: svgContent }}
        onClick={handleSVGClick}
      />
      
      {/* Render hotspots as overlays */}
      {hotspots.map((hotspot) => (
        <div
          key={hotspot.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          style={{
            left: `${hotspot.x}%`,
            top: `${hotspot.y}%`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedHotspot(hotspot);
          }}
        >
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
          <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
            {hotspot.label}
          </div>
        </div>
      ))}

      {/* Hotspot detail modal */}
      {selectedHotspot && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{selectedHotspot.label}</h3>
            <p className="text-gray-600 mb-4">Type: {selectedHotspot.node_type}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  onHotspotClick(selectedHotspot);
                  setSelectedHotspot(null);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View Details
              </button>
              <button
                onClick={() => {
                  onAssignPM(selectedHotspot);
                  setSelectedHotspot(null);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Assign PM Task
              </button>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Layer control panel
function LayerControls({ 
  layers, 
  onLayerToggle 
}: { 
  layers: ModelLayer[];
  onLayerToggle: (layerId: number, visible: boolean) => void;
}) {
  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 min-w-[200px] z-10">
      <h3 className="font-semibold mb-3">Layers</h3>
      {layers.map((layer) => (
        <div key={layer.id} className="flex items-center justify-between mb-2">
          <span className="text-sm">{layer.layer_name}</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              defaultChecked={layer.visible_default}
              onChange={(e) => onLayerToggle(layer.id, e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      ))}
    </div>
  );
}

// Main Interactive Model Viewer component
export default function InteractiveModelViewer({
  modelId,
  modelPath,
  modelType,
  hotspots,
  layers,
  onHotspotClick = () => {},
  onAssignPMTask = () => {},
  className = ''
}: InteractiveModelViewerProps) {
  const [layerVisibility, setLayerVisibility] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // Initialize layer visibility
    const initialVisibility: Record<number, boolean> = {};
    layers.forEach(layer => {
      initialVisibility[layer.id] = layer.visible_default;
    });
    setLayerVisibility(initialVisibility);
  }, [layers]);

  const handleLayerToggle = useCallback((layerId: number, visible: boolean) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layerId]: visible
    }));
    
    // TODO: Send layer visibility update to backend
    // updateLayerVisibility(modelId, { [layerId]: visible });
  }, [modelId]);

  const handleHotspotClick = useCallback((hotspot: Hotspot) => {
    console.log('Hotspot clicked:', hotspot);
    onHotspotClick(hotspot);
  }, [onHotspotClick]);

  const handleAssignPM = useCallback((hotspot: Hotspot) => {
    console.log('Assign PM to hotspot:', hotspot);
    onAssignPMTask(hotspot);
  }, [onAssignPMTask]);

  return (
    <div className={`relative w-full h-full bg-gray-100 ${className}`}>
      {modelType === '3D' ? (
        <Canvas camera={{ position: [5, 5, 5], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Model3D
            modelPath={modelPath}
            hotspots={hotspots}
            onHotspotClick={handleHotspotClick}
            onAssignPM={handleAssignPM}
          />
          <OrbitControls enablePan enableZoom enableRotate />
        </Canvas>
      ) : (
        <SVGViewer
          modelPath={modelPath}
          hotspots={hotspots}
          onHotspotClick={handleHotspotClick}
          onAssignPM={handleAssignPM}
        />
      )}

      <LayerControls
        layers={layers}
        onLayerToggle={handleLayerToggle}
      />

      {/* Navigation breadcrumb */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <div className="text-sm text-gray-600">
          Machine → Assembly → Part
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50">
          <span className="text-lg font-bold">+</span>
        </button>
        <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50">
          <span className="text-lg font-bold">−</span>
        </button>
        <button className="w-10 h-10 bg-white rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50">
          <span className="text-sm">🏠</span>
        </button>
      </div>
    </div>
  );
}
