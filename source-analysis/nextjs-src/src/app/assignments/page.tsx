'use client';

import { useAssignments } from '@/hooks/useAssignments';
import AssignmentForm from '@/components/assignments/AssignmentForm';
import AssignmentTable from '@/components/assignments/AssignmentTable';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePermissions } from '@/hooks/usePermissions';

export default function AssignmentsPage() {
  const { assignments, loading, createAssignment, endAssignment } = useAssignments();
  const { hasPermission } = usePermissions();

  useKeyboardShortcuts({});

  const handleCreate = async (data: any) => {
    const loadingToast = showToast.loading('Creating assignment...');
    try {
      await createAssignment(data);
      showToast.dismiss(loadingToast);
      showToast.success('Assignment created successfully');
    } catch (error) {
      showToast.dismiss(loadingToast);
      showToast.error('Failed to create assignment');
    }
  };

  const handleEnd = async (id: number) => {
    if (confirm('End this assignment?')) {
      const loadingToast = showToast.loading('Ending assignment...');
      try {
        await endAssignment(id);
        showToast.dismiss(loadingToast);
        showToast.success('Assignment ended');
      } catch (error) {
        showToast.dismiss(loadingToast);
        showToast.error('Failed to end assignment');
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Equipment Assignments</h1>
      
      {hasPermission('assignments.create') && (
        <div className="mb-6">
          <AssignmentForm onSubmit={handleCreate} />
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Active Assignments</h2>
        {loading ? (
          <TableSkeleton rows={8} />
        ) : (
          <AssignmentTable 
            assignments={assignments} 
            onEnd={hasPermission('assignments.end') ? handleEnd : undefined} 
          />
        )}
      </div>
    </div>
  );
}
