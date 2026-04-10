interface PriorityBadgeProps {
  priority: string;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getColors = () => {
    const normalized = priority.toLowerCase();
    if (normalized === 'high' || normalized === 'critical') return 'bg-red-100 text-red-800';
    if (normalized === 'medium') return 'bg-amber-100 text-amber-800';
    if (normalized === 'low') return 'bg-gray-100 text-gray-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getColors()}`}>
      {priority}
    </span>
  );
}
