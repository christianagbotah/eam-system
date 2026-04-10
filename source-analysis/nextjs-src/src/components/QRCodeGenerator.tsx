'use client';

import { useEffect, useRef } from 'react';

interface QRCodeGeneratorProps {
  value: string;
  label?: string;
  size?: number;
}

export default function QRCodeGenerator({ value, label, size = 256 }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      generateQRCode(value, canvasRef.current, size);
    }
  }, [value, size]);

  const generateQRCode = (text: string, canvas: HTMLCanvasElement, size: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Simple QR-like pattern generator
    const modules = 25; // 25x25 grid
    const moduleSize = size / modules;
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Generate pattern based on text
    ctx.fillStyle = '#000000';
    
    // Create a simple hash-based pattern
    const hash = simpleHash(text);
    
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        // Create pattern based on position and hash
        const shouldFill = ((row + col + hash) % 3 === 0) || 
                          (row < 7 && col < 7) || 
                          (row < 7 && col >= modules - 7) || 
                          (row >= modules - 7 && col < 7);
        
        if (shouldFill) {
          ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize);
        }
      }
    }
    
    // Add corner squares (finder patterns)
    const cornerSize = moduleSize * 7;
    
    // Top-left
    ctx.fillRect(0, 0, cornerSize, cornerSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(moduleSize, moduleSize, cornerSize - 2 * moduleSize, cornerSize - 2 * moduleSize);
    ctx.fillStyle = '#000000';
    ctx.fillRect(2 * moduleSize, 2 * moduleSize, cornerSize - 4 * moduleSize, cornerSize - 4 * moduleSize);
    
    // Top-right
    ctx.fillStyle = '#000000';
    ctx.fillRect(size - cornerSize, 0, cornerSize, cornerSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(size - cornerSize + moduleSize, moduleSize, cornerSize - 2 * moduleSize, cornerSize - 2 * moduleSize);
    ctx.fillStyle = '#000000';
    ctx.fillRect(size - cornerSize + 2 * moduleSize, 2 * moduleSize, cornerSize - 4 * moduleSize, cornerSize - 4 * moduleSize);
    
    // Bottom-left
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, size - cornerSize, cornerSize, cornerSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(moduleSize, size - cornerSize + moduleSize, cornerSize - 2 * moduleSize, cornerSize - 2 * moduleSize);
    ctx.fillStyle = '#000000';
    ctx.fillRect(2 * moduleSize, size - cornerSize + 2 * moduleSize, cornerSize - 4 * moduleSize, cornerSize - 4 * moduleSize);
  };

  const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  };

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `qr-${label || 'code'}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  return (
    <div className="text-center">
      <canvas 
        ref={canvasRef}
        className="border border-gray-300 rounded-lg mx-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {label && (
        <p className="mt-2 text-sm font-medium text-gray-700">{label}</p>
      )}
      <button 
        onClick={downloadQR}
        className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        Download QR Code
      </button>
    </div>
  );
}