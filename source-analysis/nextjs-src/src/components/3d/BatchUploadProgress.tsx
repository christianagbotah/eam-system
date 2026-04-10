'use client';

import { useEffect, useState } from 'react';
import { wsManager } from '@/lib/websocket';

export default function BatchUploadProgress({ uploadId }: { uploadId: string }) {
  const [progress, setProgress] = useState<any[]>([]);

  useEffect(() => {
    wsManager.connect();
    wsManager.on('upload_progress', (data: any) => {
      if (data.uploadId === uploadId) {
        setProgress(prev => [...prev, data]);
      }
    });

    return () => wsManager.disconnect();
  }, [uploadId]);

  return (
    <div className="space-y-2">
      {progress.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1">
            <div className="text-sm font-medium">{item.filename}</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
          <div className="text-sm text-gray-600">{item.progress}%</div>
        </div>
      ))}
    </div>
  );
}
