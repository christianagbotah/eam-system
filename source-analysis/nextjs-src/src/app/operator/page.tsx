'use client'
import { useRouter } from 'next/navigation'
import StatCard from '@/components/dashboard/StatCard'
import QuickActionCard from '@/components/dashboard/QuickActionCard'
import ChartCard from '@/components/dashboard/ChartCard'

export default function OperatorDashboard() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Operator Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="My Assignments" value="2" icon="⚙️" color="blue" />
        <StatCard title="Surveys Today" value="5" icon="📋" color="green" />
        <StatCard title="Production Units" value="342" icon="📦" color="purple" />
        <StatCard title="Shift Progress" value="68%" icon="⏱️" color="indigo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        <QuickActionCard title="Submit Survey" description="Record production data" icon="📝" href="/operator/surveys/new" color="blue" />
        <QuickActionCard title="My Equipment" description="View assigned machines" icon="🏭" href="/operator/equipment" color="green" />
        <QuickActionCard title="Production Log" description="View history" icon="📊" href="/operator/production" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="My Assigned Equipment">
          <div className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold">CNC-001</div>
                  <div className="text-sm text-gray-600">CNC Machine</div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Active</span>
              </div>
              <div className="mt-3 text-sm text-gray-600">Shift: Morning | Started: 8:00 AM</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold">Press-003</div>
                  <div className="text-sm text-gray-600">Hydraulic Press</div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">Active</span>
              </div>
              <div className="mt-3 text-sm text-gray-600">Shift: Morning | Started: 8:00 AM</div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Today's Production">
          <div className="space-y-4">
            <div className="text-center p-6 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-lg">
              <div className="text-4xl font-bold">342</div>
              <div className="text-sm mt-2">Units Produced</div>
              <div className="text-xs mt-1 opacity-80">Target: 400 units</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <span className="text-sm font-bold">85%</span>
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Recent Surveys">
        <div className="space-y-2">
          {[
            { time: '2:30 PM', equipment: 'CNC-001', qty: 45, status: 'completed' },
            { time: '12:00 PM', equipment: 'Press-003', qty: 52, status: 'completed' },
            { time: '10:15 AM', equipment: 'CNC-001', qty: 48, status: 'completed' }
          ].map((survey, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-500">{survey.time}</div>
                <div className="font-medium">{survey.equipment}</div>
                <div className="text-sm text-gray-600">{survey.qty} units</div>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">✓ {survey.status}</span>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}
