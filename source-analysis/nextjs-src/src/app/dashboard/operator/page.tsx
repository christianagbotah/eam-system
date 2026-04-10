'use client';

export default function OperatorDashboard() {
  return (
    <div className="p-6">
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h1 className="text-lg font-semibold text-blue-600">Operator Dashboard</h1>
        <p className="text-xs text-gray-600 mt-0.5">Production monitoring and operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Production Status</h3>
          <p className="text-gray-600">Monitor current production metrics</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Equipment Status</h3>
          <p className="text-gray-600">View equipment health and alerts</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Work Orders</h3>
          <p className="text-gray-600">Assigned maintenance tasks</p>
        </div>
      </div>
    </div>
  );
}