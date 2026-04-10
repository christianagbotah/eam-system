'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useEffect, useState } from 'react';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function Asset3DViewer({ assetId }: { assetId: number }) {
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/v1/eam/assets/3d-model/${assetId}`)
      .then(res => res.json())
      .then(json => {
        if (json.data?.model_file) {
          setModelUrl(`/uploads/${json.data.model_file}`);
        }
      });
  }, [assetId]);

  if (!modelUrl) {
    return <div className="p-4 text-center">No 3D model available</div>;
  }

  return (
    <div className="w-full h-[600px] bg-gray-100 rounded-lg">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Model url={modelUrl} />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
