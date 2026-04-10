'use client'

interface AssignmentTableProps {
  assignments: any[]
  onEnd: (id: number) => void
}

export default function AssignmentTable({ assignments, onEnd }: AssignmentTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {assignments.map((a: any) => (
            <tr key={a.id}>
              <td className="px-6 py-4">{a.equipment_name}</td>
              <td className="px-6 py-4">{a.operator_name || a.group_name}</td>
              <td className="px-6 py-4">{a.shift_id || '-'}</td>
              <td className="px-6 py-4">{new Date(a.start_at).toLocaleString()}</td>
              <td className="px-6 py-4">{a.end_at ? new Date(a.end_at).toLocaleString() : '-'}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded text-xs ${!a.end_at ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {!a.end_at ? 'Active' : 'Ended'}
                </span>
              </td>
              <td className="px-6 py-4">
                {!a.end_at && (
                  <button onClick={() => onEnd(a.id)} className="text-red-600 hover:text-red-800 text-sm">
                    End
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
