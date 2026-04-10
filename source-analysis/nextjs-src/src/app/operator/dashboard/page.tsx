'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import StatCard from '@/components/dashboard/StatCard'
import QuickActionCard from '@/components/dashboard/QuickActionCard'
import ChartCard from '@/components/dashboard/ChartCard'
import RequestDetailsModal from '@/components/RequestDetailsModal'

export default function OperatorDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    myAssignments: 0,
    surveysToday: 0,
    productionUnits: 0,
    shiftProgress: 0
  })
  const [assignedEquipment, setAssignedEquipment] = useState<any[]>([])
  const [recentSurveys, setRecentSurveys] = useState<any[]>([])
  const [maintenanceRequests, setMaintenanceRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [viewingRequest, setViewingRequest] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleViewRequest = (request: any) => {
    setViewingRequest(request)
    setShowDetailsModal(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'converted': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      const today = new Date().toISOString().split('T')[0]

      const [assignmentsRes, surveysRes, productionRes] = await Promise.all([
        api.get('/assignments').catch(() => ({ data: { data: [] } })),
        api.get('/production-surveys').catch(() => ({ data: { data: [] } })),
        api.get('/production-data').catch(() => ({ data: { data: [] } })),
        api.get('/maintenance-requests').catch(() => ({ data: { data: [] } }))
      ])

      const assignments = assignmentsRes.data?.data || []
      const surveys = surveysRes.data?.data || []
      const production = productionRes.data?.data || []
      const requests = (await api.get('/maintenance-requests')).data?.data || []

      const myAssignments = assignments.filter((a: any) => 
        a.assigned_to === currentUser.id && a.status === 'active'
      )

      const todaySurveys = surveys.filter((s: any) => 
        s.created_by === currentUser.id && s.created_at?.startsWith(today)
      )

      const todayProduction = production.filter((p: any) => 
        p.operator_id === currentUser.id && p.date?.startsWith(today)
      )

      const totalUnits = todayProduction.reduce((sum: number, p: any) => 
        sum + (parseInt(p.quantity) || 0), 0
      )

      // Calculate shift progress based on production, not time
      const targetUnits = 400 // Default target, could be made configurable
      const productionProgress = totalUnits > 0 ? Math.min(100, (totalUnits / targetUnits) * 100) : 0

      setStats({
        myAssignments: myAssignments.length,
        surveysToday: todaySurveys.length,
        productionUnits: totalUnits,
        shiftProgress: Math.round(productionProgress)
      })

      setAssignedEquipment(myAssignments.slice(0, 5).map((a: any) => ({
        id: a.id,
        name: a.machine_name || a.equipment_name || 'Equipment',
        type: a.machine_type || 'Machine',
        status: a.status || 'active',
        shift: a.shift || 'Morning',
        startTime: a.start_time || '8:00 AM'
      })))

      setRecentSurveys(todaySurveys.slice(0, 5).map((s: any) => ({
        id: s.id,
        time: new Date(s.created_at).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        }),
        equipment: s.machine_name || s.equipment_name || 'Equipment',
        qty: s.quantity || 0,
        status: s.status || 'completed'
      })))

      const myRequests = requests.filter((r: any) => r.requested_by === currentUser.id)
      setMaintenanceRequests(myRequests.slice(0, 10))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Operator Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="My Assignments" value={stats.myAssignments.toString()} icon="⚙️" color="blue" />
        <StatCard title="Surveys Today" value={stats.surveysToday.toString()} icon="📋" color="green" />
        <StatCard title="Production Units" value={stats.productionUnits.toString()} icon="📦" color="purple" />
        <StatCard title="Shift Progress" value={`${stats.shiftProgress}%`} icon="⏱️" color="indigo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        <QuickActionCard title="Submit Survey" description="Record production data" icon="📝" href="/operator/production-survey" color="blue" />
        <QuickActionCard title="Maintenance Request" description="Report equipment issues" icon="🔧" href="/operator/maintenance-requests" color="green" />
        <QuickActionCard title="Production Data" description="Enter production data" icon="📊" href="/operator/production-data" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard title="My Assigned Equipment">
          <div className="space-y-3">
            {assignedEquipment.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No equipment assigned</p>
            ) : (
              assignedEquipment.map((equipment) => (
                <div key={equipment.id} className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold">{equipment.name}</div>
                      <div className="text-sm text-gray-600">{equipment.type}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      equipment.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {equipment.status}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    Shift: {equipment.shift} | Started: {equipment.startTime}
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>

        <ChartCard title="Today's Production">
          <div className="space-y-4">
            <div className="text-center p-6 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-lg">
              <div className="text-4xl font-bold">{stats.productionUnits}</div>
              <div className="text-sm mt-2">Units Produced</div>
              <div className="text-xs mt-1 opacity-80">Shift Progress: {stats.shiftProgress}%</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full" 
                  style={{ width: `${stats.shiftProgress}%` }}
                ></div>
              </div>
              <span className="text-sm font-bold">{stats.shiftProgress}%</span>
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Recent Surveys">
        <div className="space-y-2">
          {recentSurveys.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No surveys submitted today</p>
          ) : (
            recentSurveys.map((survey) => (
              <div key={survey.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-500">{survey.time}</div>
                  <div className="font-medium">{survey.equipment}</div>
                  <div className="text-sm text-gray-600">{survey.qty} units</div>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  ✓ {survey.status}
                </span>
              </div>
            ))
          )}
        </div>
      </ChartCard>

      <ChartCard 
        title="My Maintenance Requests"
        actions={
          <a 
            href="/operator/maintenance-requests" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline inline-flex items-center gap-1"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {maintenanceRequests.length === 0 ? (
            <div className="col-span-2">
              <p className="text-center text-gray-500 py-8">No maintenance requests</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {maintenanceRequests.slice(0, 5).map((request) => (
                  <div key={request.id} onClick={() => handleViewRequest(request)} className="bg-white border border-gray-200 rounded-lg p-3 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm">{request.request_number}</div>
                          {request.machine_down_status === 'Yes' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">🔴 CRITICAL</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-1">{request.title}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.workflow_status === 'closed' ? 'bg-gray-100 text-gray-700' :
                        request.workflow_status === 'work_order_created' ? 'bg-blue-100 text-blue-700' :
                        request.workflow_status === 'approved' ? 'bg-green-100 text-green-700' :
                        request.workflow_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {request.workflow_status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {maintenanceRequests.slice(5, 10).map((request) => (
                  <div key={request.id} onClick={() => handleViewRequest(request)} className="bg-white border border-gray-200 rounded-lg p-3 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm">{request.request_number}</div>
                          {request.machine_down_status === 'Yes' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">🔴 CRITICAL</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-1">{request.title}</div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.workflow_status === 'closed' ? 'bg-gray-100 text-gray-700' :
                        request.workflow_status === 'work_order_created' ? 'bg-blue-100 text-blue-700' :
                        request.workflow_status === 'approved' ? 'bg-green-100 text-green-700' :
                        request.workflow_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {request.workflow_status?.replace(/_/g, ' ').toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ChartCard>

      <RequestDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        request={viewingRequest}
        getStatusColor={getStatusColor}
      />
    </div>
  )
}
