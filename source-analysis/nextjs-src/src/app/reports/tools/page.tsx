'use client';

import { useState, useEffect } from 'react';
import ToolReports from '@/components/ToolReports';

export default function ToolReportsPage() {
  const [plantId, setPlantId] = useState(1);

  useEffect(() => {
    const storedPlantId = localStorage.getItem('current_plant_id');
    if (storedPlantId) {
      setPlantId(Number(storedPlantId));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <ToolReports plantId={plantId} />
    </div>
  );
}
