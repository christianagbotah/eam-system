interface Activity {
  id: number;
  type: string;
  message: string;
  timestamp: string;
  user?: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  const getIcon = (type: string) => {
    switch(type) {
      case 'work_order': return '📋';
      case 'pm_schedule': return '📅';
      case 'inventory': return '📦';
      case 'asset': return '🏭';
      default: return '📌';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          activities.map(activity => (
            <div key={activity.id} className="flex gap-3 p-3 bg-gray-50 rounded">
              <div className="text-2xl">{getIcon(activity.type)}</div>
              <div className="flex-1">
                <p className="text-sm">{activity.message}</p>
                <div className="flex gap-2 text-xs text-gray-500 mt-1">
                  {activity.user && <span>{activity.user}</span>}
                  <span>•</span>
                  <span>{new Date(activity.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
