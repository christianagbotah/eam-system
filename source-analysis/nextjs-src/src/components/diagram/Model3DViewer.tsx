'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import { Expand, RotateCcw, Eye, EyeOff } from 'lucide-react';
import * as THREE from 'three';

interface Model3DViewerProps {
  modelPath: string;
  hotspots: any[];
  selectedNode: any;
  onNodeSelect: (node: any) => void;
  layers?: any[];
  onLayerToggle?: (layerId: number, visible: boolean) => void;
  exploded?: boolean;
  onExplodedChange?: (exploded: boolean) => void;
}

function Model({ modelPath, hotspots, selectedNode, onNodeSelect, exploded }: any) {
  const { scene } = useGLTF(modelPath);
  const [hoveredMesh, setHoveredMesh] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<any>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (selectedNode && groupRef.current) {
      // Find and highlight selected mesh
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const hotspot = hotspots.find(h => h.metadata_json?.mesh_name === child.name);
          if (hotspot?.id === selectedNode.id) {
            // Highlight selected mesh
            child.material = child.material.clone();
            child.material.emissive = new THREE.Color(0x0066ff);
            child.material.emissiveIntensity = 0.3;
            
            // Focus camera on selected mesh
            const box = new THREE.Box3().setFromObject(child);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const distance = maxDim * 2;
            
            camera.position.copy(center);
            camera.position.z += distance;
            camera.lookAt(center);
          } else {
            // Reset other meshes
            if (child.material.emissive) {
              child.material.emissive = new THREE.Color(0x000000);
              child.material.emissiveIntensity = 0;
            }
          }
        }
      });
    }
  }, [selectedNode, hotspots, camera]);

  useEffect(() => {
    if (groupRef.current && exploded !== undefined) {
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const originalPosition = child.userData.originalPosition || child.position.clone();
          child.userData.originalPosition = originalPosition;
          
          if (exploded) {
            const direction = originalPosition.clone().normalize();
            child.position.copy(originalPosition.clone().add(direction.multiplyScalar(2)));
          } else {
            child.position.copy(originalPosition);
          }
        }
      });
    }
  }, [exploded]);

  const handleMeshClick = (mesh: any) => {
    const hotspot = hotspots.find(h => h.metadata_json?.mesh_name === mesh.name);
    if (hotspot) onNodeSelect(hotspot);
  };

  const handleMeshHover = (mesh: any, hovered: boolean) => {
    setHoveredMesh(hovered ? mesh.name : null);
    const hotspot = hotspots.find(h => h.metadata_json?.mesh_name === mesh.name);
    setHoveredHotspot(hovered ? hotspot : null);
  };

  return (
    <group ref={groupRef}>
      <primitive 
        object={scene} 
        onClick={(e: any) => handleMeshClick(e.object)}
        onPointerOver={(e: any) => handleMeshHover(e.object, true)}
        onPointerOut={() => handleMeshHover(null, false)}
      />
      
      {/* Hotspot tooltips */}
      {hotspots.map((hotspot) => (
        <group key={hotspot.id} position={[hotspot.x * 10, hotspot.y * 10, hotspot.z * 10]}>
          {hoveredHotspot?.id === hotspot.id && (
            <Html distanceFactor={10}>
              <div className="bg-black text-white px-2 py-1 rounded text-sm whitespace-nowrap pointer-events-none">
                {hotspot.label}
              </div>
            </Html>
          )}
        </group>
      ))}
    </group>
  );
}

export default function Model3DViewer({
  modelPath,
  hotspots,
  selectedNode,
  onNodeSelect,
  layers = [],
  onLayerToggle,
  exploded = false,
  onExplodedChange
}: Model3DViewerProps) {
  const controlsRef = useRef<any>();
  const [layerVisibility, setLayerVisibility] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const initialVisibility: Record<number, boolean> = {};
    layers.forEach(layer => {
      initialVisibility[layer.id] = layer.visible_default;
    });
    setLayerVisibility(initialVisibility);
  }, [layers]);

  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleLayerToggle = (layerId: number, visible: boolean) => {
    setLayerVisibility(prev => ({ ...prev, [layerId]: visible }));
    onLayerToggle?.(layerId, visible);
  };

  const handleExplodedToggle = () => {
    const newExploded = !exploded;
    onExplodedChange?.(newExploded);
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={handleExplodedToggle}
          className={`p-2 rounded-lg shadow-md hover:bg-gray-50 ${
            exploded ? 'bg-blue-500 text-white' : 'bg-white'
          }`}
        >
          <Expand size={20} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Layer Controls */}
      {layers.length > 0 && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md p-3 max-w-xs z-10">
          <h4 className="font-medium mb-2 text-sm">Layers</h4>
          {layers.map((layer) => (
            <div key={layer.id} className="flex items-center justify-between mb-1">
              <span className="text-xs">{layer.layer_name}</span>
              <button
                onClick={() => handleLayerToggle(layer.id, !layerVisibility[layer.id])}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {layerVisibility[layer.id] ? (
                  <Eye size={14} className="text-blue-500" />
                ) : (
                  <EyeOff size={14} className="text-gray-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <Canvas camera={{ position: [5, 5, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Model
          modelPath={modelPath}
          hotspots={hotspots}
          selectedNode={selectedNode}
          onNodeSelect={onNodeSelect}
          exploded={exploded}
        />
        <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate />
      </Canvas>
    </div>
  );
}
