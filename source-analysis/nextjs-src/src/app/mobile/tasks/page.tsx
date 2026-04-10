'use client'
import { useState } from 'react'

export default function TasksPage() {
  const [tasks] = useState([
    { id: 1, title: 'Oil change - CNC-001', priority: 'high', status: 'in_progress', due: '2 hours' },
    { id: 2, title: 'Belt inspection - Conveyor A', priority: 'medium', status: 'open', due: '1 day' },
    { id: 3, title: 'Filter replacement - Compressor', priority: 'low', status: 'open', due: '3 days' }
  ])

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg p-4 shadow">
        <h2 className="text-lg font-bold">My Tasks</h2>
        <p className="text-sm text-gray-600">{tasks.length} active work orders</p>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white rounded-lg shadow">
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold">{task.title}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {task.priority.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <span>⏰ Due in {task.due}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 bg-green-600 text-white py-2 rounded text-sm">
                  Start
                </button>
                <button className="flex-1 bg-blue-600 text-white py-2 rounded text-sm">
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
