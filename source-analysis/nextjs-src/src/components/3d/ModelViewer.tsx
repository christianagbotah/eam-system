'use client';

export default function ModelViewer({ modelPath }: { modelPath: string }) {
  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-gray-500">3D Model: {modelPath}</div>
    </div>
  );
}
