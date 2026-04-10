'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Comments from '@/components/Comments';
import Attachments from '@/components/Attachments';
import WorkOrderTeamAssignment from '@/components/WorkOrderTeamAssignment';
import { maintenanceService } from '@/services/maintenanceService';
import { showToast } from '@/lib/toast';

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [showTeamAssignment, setShowTeamAssignment] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [assistanceRequests, setAssistanceRequests] = useState<any[]>([]);
  const [slaTracking, setSlaTracking] = useState<any>(null);

  useEffect(() => {
    loadWorkOrder();
    loadTeam();
    loadAssistanceRequests();
    loadSlaTracking();
  }, [params.id]);

  const loadWorkOrder = async () => {
    try {
      const res = await maintenanceService.getWorkOrders({ id: params.id });
      setWorkOrder((res.data as any)?.data[0]);
    } catch (error) {
      showToast.error('Failed to load work order');
    } finally {
      setLoading(false);
    }
  };

  const loadTeam = async () => {
    try {
      const res = await maintenanceService.getTeam(Number(params.id));
      setTeam(res.data.data || []);
    } catch (error) {
      console.error('Failed to load team:', error);
    }
  };

  const loadAssistanceRequests = async () => {
    try {
      const res = await maintenanceService.getAssistanceRequests(Number(params.id));
      setAssistanceRequests(res.data.data || []);
    } catch (error) {
      console.error('Failed to load assistance requests:', error);
    }
  };

  const loadSlaTracking = async () => {
    try {
      const res = await maintenanceService.getSlaTracking(Number(params.id));
      setSlaTracking(res.data.data);
    } catch (error) {
      console.error('Failed to load SLA tracking:', error);
    }
  };

  const handleStatusUpdate = async (action: string) => {
    try {
      switch (action) {
        case 'acknowledge':
          await maintenanceService.acknowledgeWorkOrder(Number(params.id));
          break;
        case 'start':
          await maintenanceService.startWork(Number(params.id));
          break;
        case 'complete':
          await maintenanceService.completeWork(Number(params.id), 'Work completed');
          break;
        case 'close':
          await maintenanceService.closeWorkOrder(Number(params.id));
          break;
      }
      showToast.success('Status updated');
      loadWorkOrder();
    } catch (error) {
      showToast.error('Failed to update status');
    }
  };

  const handleRequestAssistance = async () => {
    const reason = prompt('Reason for assistance:');
    if (!reason) return;
    try {
      await maintenanceService.createAssistanceRequest(Number(params.id), {
        requested_by: 1,
        reason,
        urgency: 'medium'
      });
      showToast.success('Assistance requested');
      loadAssistanceRequests();
    } catch (error) {
      showToast.error('Failed to request assistance');
    }
  };

  if (loading) return <DashboardLayout role="technician"><div className="p-6">Loading...</div></DashboardLayout>;
  if (!workOrder) return <DashboardLayout role="technician"><div className="p-6">Work order not found</div></DashboardLayout>;

  return (
    <DashboardLayout role="technician">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-700 mb-2">← Back</button>
            <h1 className="text-2xl font-bold">Work Order #{workOrder.id}</h1>
            {slaTracking && (
              <div className="mt-2">
                {slaTracking.response_breached || slaTracking.resolution_breached ? (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded">SLA Breached</span>
                ) : (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">SLA On Track</span>
                )}
              </div>
            )}
          </div>
          <div className="space-x-2">
            <button onClick={() => setShowTeamAssignment(true)} className="bg-blue-600 text-white px-4 py-2 rounded">
              Manage Team
            </button>
            <button onClick={handleRequestAssistance} className="bg-orange-600 text-white px-4 py-2 rounded">
              Request Help
            </button>
            {workOrder.status === 'assigned' && (
              <button onClick={() => handleStatusUpdate('acknowledge')} className="bg-blue-600 text-white px-4 py-2 rounded">
                Acknowledge
              </button>
            )}
            {workOrder.status === 'acknowledged' && (
              <button onClick={() => handleStatusUpdate('start')} className="bg-green-600 text-white px-4 py-2 rounded">
                Start Work
              </button>
            )}
            {workOrder.status === 'in_progress' && (
              <button onClick={() => handleStatusUpdate('complete')} className="bg-purple-600 text-white px-4 py-2 rounded">
                Complete
              </button>
            )}
            {workOrder.status === 'completed' && (
              <button onClick={() => handleStatusUpdate('close')} className="bg-gray-600 text-white px-4 py-2 rounded">
                Close
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 border-b">
          <nav className="flex space-x-4">
            {['details', 'team', 'assistance', 'comments', 'attachments'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-4 ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'details' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <p className="font-medium">{workOrder.status}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Priority</label>
                <p className="font-medium">{workOrder.priority}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Asset</label>
                <p className="font-medium">{workOrder.asset_name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Assigned To</label>
                <p className="font-medium">{workOrder.assigned_to_name || 'Unassigned'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Description</label>
                <p className="font-medium">{workOrder.description}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Team Members</h3>
            {team.length === 0 ? (
              <p className="text-gray-500">No team members assigned</p>
            ) : (
              <div className="space-y-2">
                {team.map((member: any) => (
                  <div key={member.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">Technician #{member.technician_id}</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${
                        member.role === 'team_lead' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.role.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">{member.labor_hours}h</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assistance' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Assistance Requests</h3>
            {assistanceRequests.length === 0 ? (
              <p className="text-gray-500">No assistance requests</p>
            ) : (
              <div className="space-y-2">
                {assistanceRequests.map((req: any) => (
                  <div key={req.id} className="p-4 border rounded">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        req.urgency === 'high' ? 'bg-red-100 text-red-800' :
                        req.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {req.urgency}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        req.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-sm">{req.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="bg-white rounded-lg shadow p-6">
            <Comments entityType="work_order" entityId={Number(params.id)} currentUserId={1} />
          </div>
        )}

        {activeTab === 'attachments' && (
          <div className="bg-white rounded-lg shadow p-6">
            <Attachments entityType="work_order" entityId={Number(params.id)} currentUserId={1} />
          </div>
        )}

        {showTeamAssignment && (
          <WorkOrderTeamAssignment
            workOrderId={Number(params.id)}
            onClose={() => setShowTeamAssignment(false)}
            onSuccess={() => { loadTeam(); setShowTeamAssignment(false); }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}