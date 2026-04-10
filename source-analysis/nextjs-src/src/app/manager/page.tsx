export default function ManagerDashboard() {
  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">Manager Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Pending Work Orders</h3>
          <p className="text-lg font-semibold">42</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Low Stock Items</h3>
          <p className="text-lg font-semibold">8</p>
        </div>
      </div>
    </div>
  )
}
