'use client';

import ToolTransferComponent from '@/components/ToolTransfer';

export default function ShopAttendantToolTransfersPage() {
  return (
    <div className="p-6">
      <ToolTransferComponent userRole="shop-attendant" />
    </div>
  );
}