'use client';

/**
 * MinimalR3FTest — Binary Search Step 3
 *
 * Step 1: Canvas + box only → WORKED ✅
 * Step 2: Full DigitalTwinViewer (no props) → CRASHED ❌
 * Step 3: Canvas + OrbitControls + box → Testing now
 *
 * If THIS crashes → OrbitControls is the culprit
 * If THIS works → the culprit is elsewhere in DigitalTwinViewer (useCameraControls, Zustand, etc.)
 */

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

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
        {/* STEP 3: Added OrbitControls — most complex drei child */}
        <OrbitControls makeDefault enableDamping />
        <SpinningBox />
      </Canvas>
      <div
        className="absolute bottom-4 left-4 px-3 py-2 rounded-lg text-xs font-mono z-10"
        style={{
          background: 'rgba(10,10,18,0.8)',
          border: '1px solid rgba(34,211,238,0.3)',
          color: '#22d3ee',
        }}
      >
        Step 3: Canvas + OrbitControls — drag to rotate
      </div>
    </div>
  );
}
