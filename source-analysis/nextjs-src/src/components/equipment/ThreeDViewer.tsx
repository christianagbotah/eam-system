'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { useState, useRef } from 'react';
import * as THREE from 'three';

interface Part {
  id: number;
  name: string;
  position: [number, number, number];
  color: string;
  status: 'good' | 'due_soon' | 'overdue' | 'no_pm';
}

interface ThreeDViewerProps {
  parts: Part[];
  onPartClick: (part: Part) => void;
}

function PartMesh({ part, onClick, isSelected }: { part: Part; onClick: () => void; isSelected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const statusColors = {
    good: '#10b981',
    due_soon: '#f59e0b',
    overdue: '#ef4444',
    no_pm: '#6b7280',
  };

  return (
    <mesh
      ref={meshRef}
      position={part.position}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={isSelected ? '#3b82f6' : hovered ? '#60a5fa' : statusColors[part.status]}
        emissive={isSelected || hovered ? '#3b82f6' : '#000000'}
        emissiveIntensity={isSelected ? 0.5 : hovered ? 0.3 : 0}
      />
    </mesh>
  );
}

function Scene({ parts, onPartClick, selectedPartId }: { parts: Part[]; onPartClick: (part: Part) => void; selectedPartId: number | null }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[5, 5, 5]} />
      <OrbitControls enableDamping dampingFactor={0.05} />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      
      <Environment preset="warehouse" />
      
      {parts.map((part) => (
        <PartMesh
          key={part.id}
          part={part}
          onClick={() => onPartClick(part)}
          isSelected={selectedPartId === part.id}
        />
      ))}
      
      <gridHelper args={[20, 20]} />
    </>
  );
}

export default function ThreeDViewer({ parts, onPartClick }: ThreeDViewerProps) {
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);

  const handlePartClick = (part: Part) => {
    setSelectedPartId(part.id);
    onPartClick(part);
  };

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden">
      <Canvas shadows>
        <Scene parts={parts} onPartClick={handlePartClick} selectedPartId={selectedPartId} />
      </Canvas>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-4 shadow-lg">
        <h4 className="text-sm font-semibold mb-2">PM Status</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Due Soon</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>No PM</span>
          </div>
        </div>
      </div>
    </div>
  );
}
