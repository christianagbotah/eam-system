interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      requested: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      planned: 'bg-purple-100 text-purple-800',
      assigned: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-orange-100 text-orange-800',
      waiting_parts: 'bg-red-100 text-red-800',
      on_hold: 'bg-gray-100 text-gray-800',
      completed: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(status)}`}>
      {status?.replace('_', ' ').toUpperCase()}
    </span>
  );
}
