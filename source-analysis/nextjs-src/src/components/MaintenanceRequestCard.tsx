import { Eye, Edit, Trash2, Clock, MapPin, AlertCircle, Wrench } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface MaintenanceRequestCardProps {
  request: any;
  onView: (req: any) => void;
  onEdit?: (req: any) => void;
  onDelete?: (id: number) => void;
  onConvertToWorkOrder?: (req: any) => void;
  getStatusColor: (status: string) => string;
  showActions?: boolean;
  showConvertButton?: boolean;
}

export default function MaintenanceRequestCard({
  request: req,
  onView,
  onEdit,
  onDelete,
  onConvertToWorkOrder,
  getStatusColor,
  showActions = true,
  showConvertButton = false
}: MaintenanceRequestCardProps) {
  return (
    <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all duration-200 border-b border-gray-200 last:border-b-0">
      <div className="flex gap-2">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <AlertCircle className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{req.title || 'Untitled Request'}</h3>
          <p className="text-gray-600 text-xs line-clamp-1">{req.description || 'No description'}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap gap-1 justify-end">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(req.status || 'pending')}`}>
              {(req.status || 'pending').replace('_', ' ').toUpperCase()}
            </span>
            {req.item_type === 'machine' && req.machine_down_status === 'Yes' && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-red-100 text-red-800 border-red-200">
                🔴 MACHINE BROKEDOWN
              </span>
            )}
            {req.item_type === 'machine' && req.machine_down_status === 'No' && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-green-100 text-green-800 border-green-200">
                ✅ NORMAL
              </span>
            )}
            {req.location && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-700 border border-gray-200 inline-flex items-center gap-0.5">
                <MapPin className="w-2.5 h-2.5" />
                {req.location}
              </span>
            )}
            {req.created_at && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-700 border border-gray-200 inline-flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatDate(req.created_at)} {new Date(req.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            )}
          </div>
          {showActions && (
            <div className="flex gap-1">
              {showConvertButton && !req.work_order_id && onConvertToWorkOrder && (
                <button
                  onClick={() => onConvertToWorkOrder(req)}
                  className="px-2 py-1 text-[10px] bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors font-medium inline-flex items-center gap-1 border border-green-200"
                >
                  <Wrench className="w-3 h-3" />
                  Convert to WO
                </button>
              )}
              {req.status === 'pending' && onEdit && (
                <>
                  <button
                    onClick={() => onEdit(req)}
                    className="px-2 py-1 text-[10px] bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors font-medium inline-flex items-center gap-1 border border-amber-200"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(req.id)}
                      className="px-2 py-1 text-[10px] bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors font-medium inline-flex items-center gap-1 border border-red-200"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => onView(req)}
                className="px-2 py-1 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors font-medium inline-flex items-center gap-1 border border-blue-200"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
