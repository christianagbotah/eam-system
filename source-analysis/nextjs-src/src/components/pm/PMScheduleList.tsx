'use client';

import { useRouter } from 'next/navigation';
import { PMSchedule } from '@/services/pmService';

interface PMScheduleListProps {
  schedules: PMSchedule[];
  loading: boolean;
  onGenerateWorkOrder: (scheduleId: number) => void;
}

export default function PMScheduleList({ schedules, loading, onGenerateWorkOrder }: PMScheduleListProps) {
  const router = useRouter();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-blue-100 text-blue-800';
      case 'generated': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string | undefined) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Usage</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {schedules.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                No PM schedules found
              </td>
            </tr>
          ) : (
            schedules.map((schedule) => (
              <tr 
                key={schedule.id} 
                className={`hover:bg-gray-50 ${
                  isOverdue(schedule.next_due_date) ? 'bg-red-50' : ''
                }`}
              >
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{schedule.title}</div>
                    <div className="text-sm text-gray-500">{schedule.description}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {schedule.next_due_date ? (
                    <div className={isOverdue(schedule.next_due_date) ? 'text-red-600 font-medium' : ''}>
                      {new Date(schedule.next_due_date).toLocaleDateString()}
                      {isOverdue(schedule.next_due_date) && (
                        <div className="text-xs text-red-500">Overdue</div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {schedule.next_due_usage ? (
                    <div>
                      {schedule.next_due_usage.toLocaleString()}
                      <div className="text-xs text-gray-500">units</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(schedule.priority)}`}>
                    {schedule.priority}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(schedule.status)}`}>
                    {schedule.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                  {schedule.maintenance_type}
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => router.push(`/pm/schedules/${schedule.id}`)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View
                  </button>
                  {schedule.status === 'waiting' && (
                    <button
                      onClick={() => onGenerateWorkOrder(schedule.id)}
                      className="text-green-600 hover:text-green-800"
                    >
                      Generate WO
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
