'use client'
import { useRouter } from 'next/navigation'
import StatCard from '@/components/dashboard/StatCard'
import QuickActionCard from '@/components/dashboard/QuickActionCard'
import ChartCard from '@/components/dashboard/ChartCard'

export default function ShopAttendantDashboard() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Shop Attendant Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Items" value="342" icon="📦" color="blue" />
        <StatCard title="Low Stock Items" value="12" icon="⚠️" color="red" />
        <StatCard title="Pending Requests" value="8" icon="📋" color="yellow" />
        <StatCard title="Today's Issues" value="15" icon="✅" color="green" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <QuickActionCard title="Issue Parts" description="Process part requests" icon="📤" href="/shop-attendant/issue" color="blue" />
        <QuickActionCard title="Receive Stock" description="Add new inventory" icon="📥" href="/shop-attendant/receive" color="green" />
        <QuickActionCard title="Inventory" description="View all items" icon="📦" href="/shop-attendant/inventory" color="purple" />
        <QuickActionCard title="Reports" description="Stock reports" icon="📊" href="/shop-attendant/reports" color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="Low Stock Alerts">
          <div className="space-y-2">
            {[
              { item: 'Hydraulic Oil', qty: 5, min: 20, unit: 'L' },
              { item: 'V-Belt Type A', qty: 3, min: 10, unit: 'pcs' },
              { item: 'Air Filter', qty: 2, min: 8, unit: 'pcs' },
              { item: 'Bearing 6205', qty: 4, min: 15, unit: 'pcs' }
            ].map((item, i) => (
              <div key={i} className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">{item.item}</div>
                    <div className="text-xs text-xs text-gray-600 mt-0.5">Current: {item.qty} {item.unit} | Min: {item.min} {item.unit}</div>
                  </div>
                  <button className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600">
                    Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Pending Part Requests">
          <div className="space-y-2">
            {[
              { id: 'REQ-001', tech: 'John Smith', part: 'Motor Bearing', status: 'pending' },
              { id: 'REQ-002', tech: 'Maria Garcia', part: 'Hydraulic Seal', status: 'pending' },
              { id: 'REQ-003', tech: 'Ahmed Hassan', part: 'Control Panel', status: 'processing' }
            ].map((req) => (
              <div key={req.id} className="p-3 bg-gray-50 rounded flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{req.id}</div>
                  <div className="text-xs text-gray-600">{req.tech} - {req.part}</div>
                </div>
                <button className="px-2 py-0.5 bg-green-500 text-white rounded text-[10px] hover:bg-green-600">
                  Issue
                </button>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChartCard title="Stock Categories">
          <div className="space-y-3">
            {[
              { name: 'Spare Parts', count: 145, color: 'blue' },
              { name: 'Consumables', count: 89, color: 'green' },
              { name: 'Tools', count: 67, color: 'purple' },
              { name: 'Safety Equipment', count: 41, color: 'yellow' }
            ].map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <span className="text-sm">{cat.name}</span>
                <span className={`px-3 py-1 rounded text-sm font-bold bg-${cat.color}-100 text-${cat.color}-700`}>
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Today's Activity">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-4 bg-green-50 rounded">
              <div className="text-base font-semibold text-green-600">15</div>
              <div className="text-xs text-gray-600">Parts Issued</div>
            </div>
            <div className="p-4 bg-blue-50 rounded">
              <div className="text-base font-semibold text-blue-600">8</div>
              <div className="text-xs text-gray-600">Stock Received</div>
            </div>
            <div className="p-4 bg-purple-50 rounded">
              <div className="text-base font-semibold text-purple-600">23</div>
              <div className="text-xs text-gray-600">Transactions</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded">
              <div className="text-base font-semibold text-yellow-600">12</div>
              <div className="text-xs text-gray-600">Low Stock</div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Recent Transactions">
          <div className="space-y-2">
            {[
              { time: '2:30 PM', action: 'Issued', item: 'V-Belt' },
              { time: '1:15 PM', action: 'Received', item: 'Hydraulic Oil' },
              { time: '11:45 AM', action: 'Issued', item: 'Air Filter' }
            ].map((tx, i) => (
              <div key={i} className="text-sm p-2 bg-gray-50 rounded">
                <div className="flex justify-between">
                  <span className="font-medium">{tx.action}</span>
                  <span className="text-gray-500">{tx.time}</span>
                </div>
                <div className="text-xs text-xs text-gray-600 mt-0.5">{tx.item}</div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
