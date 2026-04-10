'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Html } from '@react-three/drei';
import { useState } from 'react';

interface Hotspot {
  id: number;
  position: [number, number, number];
  assetId: number;
  assetName: string;
  status: string;
}

interface EnhancedModelViewerProps {
  modelUrl: string;
  hotspots: Hotspot[];
  onHotspotClick?: (assetId: number) => void;
}

function HotspotMarker({ hotspot, onClick }: { hotspot: Hotspot; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  
  const color = hotspot.status === 'active' ? '#10b981' : 
                hotspot.status === 'maintenance' ? '#f59e0b' : '#ef4444';

  return (
    <group position={hotspot.position}>
      <mesh
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? 1.5 : 1}
      >
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-white px-3 py-2 rounded shadow-lg border border-gray-200 whitespace-nowrap">
            <p className="font-semibold text-sm">{hotspot.assetName}</p>
            <p className="text-xs text-gray-600">Status: {hotspot.status}</p>
            <p className="text-xs text-blue-600 mt-1">Click for details</p>
          </div>
        </Html>
      )}
    </group>
  );
}

export default function EnhancedModelViewer({ modelUrl, hotspots, onHotspotClick }: EnhancedModelViewerProps) {
  return (
    <div className="w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden">
      <Canvas>
        <PerspectiveCamera makeDefault position={[5, 5, 5]} />
        <OrbitControls enableDamping dampingFactor={0.05} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        
        {/* Hotspots */}
        {hotspots.map((hotspot) => (
          <HotspotMarker
            key={hotspot.id}
            hotspot={hotspot}
            onClick={() => onHotspotClick?.(hotspot.assetId)}
          />
        ))}
        
        {/* Grid */}
        <gridHelper args={[20, 20]} />
      </Canvas>
    </div>
  );
}
