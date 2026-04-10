'use client';

import { useState, useEffect } from 'react';
import ToolTransferComponent from '@/components/ToolTransfer';

export default function TechnicianToolTransfersPage() {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    // Get user ID from localStorage or context
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserId(user.id);
  }, []);

  return (
    <div className="p-6">
      <ToolTransferComponent userRole="technician" userId={userId} />
    </div>
  );
}