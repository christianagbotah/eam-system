interface Activity {
  id: string
  title: string
  description: string
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error'
  icon?: string
}

interface RecentActivityListProps {
  activities: Activity[]
  title?: string
}

export default function RecentActivityList({ activities, title = 'Recent Activity' }: RecentActivityListProps) {
  const typeColors = {
    info: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    error: 'bg-red-100 text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 pb-4 border-b last:border-b-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${typeColors[activity.type]} flex-shrink-0`}>
                {activity.icon || '📋'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{activity.title}</p>
                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                <p className="text-xs text-gray-400 mt-1">{activity.timestamp}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
