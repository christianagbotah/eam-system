'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePmTasks } from '@/hooks/usePmTasks';
import { useAuth } from '@/hooks/useAuth';
import PMStatusWidget from '@/components/pm/PMStatusWidget';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

export default function PMTasksPage() {
  const { user } = useAuth();
  const { tasks, loading, error, startTask } = usePmTasks(user?.id);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'in_progress'>('all');

  const filteredTasks = tasks.filter(task => 
    filter === 'all' || task.status === filter
  );

  const taskCounts = {
    assigned: tasks.filter(t => t.status === 'assigned').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    total: tasks.length
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStartTask = async (taskId: number) => {
    try {
      await startTask(taskId);
    } catch (err) {
      console.error('Failed to start task:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-base font-semibold text-gray-900">My PM Tasks</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('assigned')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'assigned' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Assigned
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            In Progress
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <PMStatusWidget
          title="Assigned Tasks"
          count={taskCounts.assigned}
          color="blue"
        />
        <PMStatusWidget
          title="In Progress"
          count={taskCounts.in_progress}
          color="green"
        />
        <PMStatusWidget
          title="Total Tasks"
          count={taskCounts.total}
          color="gray"
        />
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              {filter === 'all' ? 'No PM tasks assigned' : `No ${filter.replace('_', ' ')} tasks`}
            </div>
          </Card>
        ) : (
          filteredTasks.map(task => (
            <Card key={task.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {task.title}
                    </h3>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">WO:</span> {task.wo_number} • 
                    <span className="font-medium ml-2">Asset:</span> {task.asset_name} • 
                    <span className="font-medium ml-2">Est. Hours:</span> {task.estimated_hours}
                  </div>
                  
                  <p className="text-gray-700 mb-3">{task.description}</p>
                  
                  {task.next_due_date && (
                    <div className="text-sm text-gray-500">
                      Next Due: {formatDate(task.next_due_date)}
                      {task.remaining_life && (
                        <span className="ml-2">• Remaining Life: {task.remaining_life}%</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2 ml-6">
                  {task.status === 'assigned' && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Start Task
                    </button>
                  )}
                  
                  <Link
                    href={`/pm/tasks/${task.id}`}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm text-center"
                  >
                    {task.status === 'in_progress' ? 'Continue' : 'View Details'}
                  </Link>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
