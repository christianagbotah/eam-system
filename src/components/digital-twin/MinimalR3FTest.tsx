'use client';

/**
 * MinimalR3FTest — Diagnostic component to determine if R3F v9 + React 19
 * works at all. If THIS crashes with Error #185, the issue is R3F + React 19
 * incompatibility, not our component code.
 *
 * Usage: Swap DigitalTwinViewer with MinimalR3FTest in ViewerLoader.
 */

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';

MinimalR3FTest.displayName = 'MinimalR3FTest';

function SpinningBox() {
  const [hovered, setHovered] = useState(false);
  return (
    <mesh
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color={hovered ? '#22d3ee' : '#10b981'} />
    </mesh>
  );
}

export function MinimalR3FTest() {
  return (
    <div
      className="w-full h-full relative"
      style={{ background: '#0a0a12' }}
    >
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <SpinningBox />
      </Canvas>
      {/* Diagnostic label */}
      <div
        className="absolute bottom-4 left-4 px-3 py-2 rounded-lg text-xs font-mono z-10"
        style={{
          background: 'rgba(10,10,18,0.8)',
          border: '1px solid rgba(34,211,238,0.3)',
          color: '#22d3ee',
        }}
      >
        Minimal R3F Test — hover the box
      </div>
    </div>
  );
}
