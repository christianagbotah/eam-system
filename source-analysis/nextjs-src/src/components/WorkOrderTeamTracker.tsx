'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface WorkOrderTeamTrackerProps {
  workOrderId: number;
}

export default function WorkOrderTeamTracker({ workOrderId }: WorkOrderTeamTrackerProps) {
  const [teamData, setTeamData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [workOrderId]);

  const loadTeamData = async () => {
    try {
      const res = await api.get(`/work-order-team/${workOrderId}`);
      setTeamData(res.data?.data);
    } catch (error) {
      console.error('Error loading team data:', error);
    }
  };

  const handleStartWork = async () => {
    setLoading(true);
    try {
      await api.post(`/work-order-team/${workOrderId}/start`);
      loadTeamData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to start work');
    } finally {
      setLoading(false);
    }
  };

  const handleEndWork = async () => {
    setLoading(true);
    try {
      await api.post(`/work-order-team/${workOrderId}/end`);
      loadTeamData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to end work');
    } finally {
      setLoading(false);
    }
  };

  if (!teamData) return <div>Loading...</div>;

  const currentUserMember = teamData.team_members?.find((m: any) => m.is_current_user);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">Team Work Tracking</h3>
      
      {currentUserMember && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Your Status: {currentUserMember.status}</span>
            {currentUserMember.is_leader && (
              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Team Leader</span>
            )}
          </div>
          
          {currentUserMember.start_time && (
            <div className="text-sm text-gray-600 mb-2">
              Started: {new Date(currentUserMember.start_time).toLocaleString()}
            </div>
          )}
          
          {currentUserMember.hours_worked && (
            <div className="text-sm text-gray-600 mb-2">
              Hours Worked: {currentUserMember.hours_worked}
            </div>
          )}

          <div className="flex space-x-2 mt-3">
            {!currentUserMember.start_time && (
              <button
                onClick={handleStartWork}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start Work
              </button>
            )}
            
            {currentUserMember.start_time && !currentUserMember.end_time && (
              <button
                onClick={handleEndWork}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                End Work
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-medium mb-3">Team Members</h4>
        <div className="space-y-2">
          {teamData.team_members?.map((member: any) => (
            <div key={member.id} className="flex justify-between items-center p-3 border rounded">
              <div>
                <div className="font-medium">
                  {member.full_name || member.username}
                  {member.is_leader && <span className="ml-2 text-xs text-blue-600">(Leader)</span>}
                </div>
                <div className="text-sm text-gray-600">
                  Status: {member.status} | Hours: {member.hours_worked || 0}
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs ${
                member.status === 'completed' ? 'bg-green-100 text-green-800' :
                member.status === 'active' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {member.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
