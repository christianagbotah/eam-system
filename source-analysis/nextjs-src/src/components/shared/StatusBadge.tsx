interface StatusBadgeProps {
  status: string;
  type?: 'workorder' | 'asset' | 'inventory' | 'pm';
}

export default function StatusBadge({ status, type = 'workorder' }: StatusBadgeProps) {
  const getColors = () => {
    const normalized = status.toLowerCase();
    
    if (type === 'workorder') {
      if (normalized === 'completed') return 'bg-green-100 text-green-800';
      if (normalized === 'in_progress') return 'bg-blue-100 text-blue-800';
      if (normalized === 'open') return 'bg-gray-100 text-gray-800';
      if (normalized === 'cancelled') return 'bg-red-100 text-red-800';
    }
    
    if (type === 'asset') {
      if (normalized === 'operational') return 'bg-green-100 text-green-800';
      if (normalized === 'maintenance') return 'bg-amber-100 text-amber-800';
      if (normalized === 'down') return 'bg-red-100 text-red-800';
    }
    
    if (type === 'inventory') {
      if (normalized === 'in_stock') return 'bg-green-100 text-green-800';
      if (normalized === 'low_stock') return 'bg-amber-100 text-amber-800';
      if (normalized === 'out_of_stock') return 'bg-red-100 text-red-800';
    }
    
    if (type === 'pm') {
      if (normalized === 'completed') return 'bg-green-100 text-green-800';
      if (normalized === 'scheduled') return 'bg-blue-100 text-blue-800';
      if (normalized === 'overdue') return 'bg-red-100 text-red-800';
    }
    
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getColors()}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
