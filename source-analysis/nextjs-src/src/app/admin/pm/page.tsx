'use client'
import { useState, useEffect } from 'react'
import DataTable from '@/components/DataTable'
import Modal from '@/components/Modal'
import FormInput from '@/components/FormInput'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission } from '@/utils/permissions'
import { api } from '@/lib/api'
import { showToast } from '@/lib/toast'
import { TableSkeleton } from '@/components/Skeleton'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import BulkActions, { useBulkSelection } from '@/components/BulkActions'

export default function PMPage() {
  const [pms, setPms] = useState([])
  const [filteredPms, setFilteredPms] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ pm_code: '', equipment_id: '', frequency: '', next_due_date: '', description: '' })
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const itemsPerPage = 10
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(filteredPms)

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? pms.filter((p: any) => selectedIds.includes(p.id)) : pms;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map((p: any) => Object.values(p).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pm-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('PM schedules exported');
  };

  useKeyboardShortcuts({
    onNew: () => { resetForm(); setIsModalOpen(true); },
    onExport: handleExport,
    onClose: () => { setIsModalOpen(false); resetForm(); }
  });

  useEffect(() => {
    fetchPms()
  }, [])

  useEffect(() => {
    const filtered = pms.filter((pm: any) =>
      pm.pm_code?.toLowerCase().includes(search.toLowerCase())
    )
    setFilteredPms(filtered)
  }, [search, pms])

  const fetchPms = async () => {
    try {
      const res = await api.get('/pm-schedules')
      setPms((res.data as any)?.data || [])
    } catch (err) {
      showToast.error('Failed to fetch PM schedules')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const loadingToast = showToast.loading(editingId ? 'Updating...' : 'Creating...')
    try {
      if (editingId) {
        await api.put(`/pm-schedules/${editingId}`, formData)
        showToast.dismiss(loadingToast)
        showToast.success('PM schedule updated')
      } else {
        await api.post('/pm-schedules', formData)
        showToast.dismiss(loadingToast)
        showToast.success('PM schedule created')
      }
      setIsModalOpen(false)
      fetchPms()
      resetForm()
    } catch (err) {
      showToast.dismiss(loadingToast)
      showToast.error('Failed to save PM schedule')
    }
  }

  const handleEdit = (row: any) => {
    setEditingId(row.id)
    setFormData({ pm_code: row.pm_code, equipment_id: row.equipment_id, frequency: row.frequency, next_due_date: row.next_due_date, description: row.description })
    setIsModalOpen(true)
  }

  const handleDelete = async (row: any) => {
    if (confirm('Delete this PM schedule?')) {
      const loadingToast = showToast.loading('Deleting...')
      try {
        await api.delete(`/pm-schedules/${row.id}`)
        showToast.dismiss(loadingToast)
        showToast.success('PM schedule deleted')
        fetchPms()
      } catch (error) {
        showToast.dismiss(loadingToast)
        showToast.error('Failed to delete')
      }
    }
  }

  const resetForm = () => {
    setFormData({ pm_code: '', equipment_id: '', frequency: '', next_due_date: '', description: '' })
    setEditingId(null)
  }

  const columns = [
    { key: 'pm_code', label: 'PM Code' },
    { key: 'equipment_name', label: 'Equipment' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'next_due_date', label: 'Next Due Date' },
    { key: 'status', label: 'Status', render: (val: string) => <span className={`px-2 py-1 rounded text-xs ${val === 'scheduled' ? 'bg-blue-100 text-blue-800' : val === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{val}</span> },
  ]

  const paginatedData = filteredPms.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filteredPms.length / itemsPerPage)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-semibold">Preventive Maintenance</h1>
        <div className="flex gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search PM..." />
          {hasPermission(user?.role || '', 'create') && (
            <button onClick={() => { resetForm(); setIsModalOpen(true) }} className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700">
              Add PM Schedule
            </button>
          )}
        </div>
      </div>
      <BulkActions
        selectedIds={selectedIds}
        totalCount={filteredPms.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkExport={handleExport}
      />

      <div className="bg-white rounded-lg shadow">
        {loading ? <div className="p-6"><TableSkeleton rows={10} /></div> : <DataTable 
          columns={columns} 
          data={paginatedData} 
          onEdit={hasPermission(user?.role || '', 'update') ? handleEdit : undefined}
          onDelete={hasPermission(user?.role || '', 'delete') ? handleDelete : undefined}
        />
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm() }} title={editingId ? 'Edit PM Schedule' : 'Add PM Schedule'}>
        <form onSubmit={handleSubmit}>
          <FormInput label="PM Code" value={formData.pm_code} onChange={(e) => setFormData({...formData, pm_code: e.target.value})} required />
          <FormInput label="Equipment ID" type="number" value={formData.equipment_id} onChange={(e) => setFormData({...formData, equipment_id: e.target.value})} required />
          <FormInput label="Frequency" value={formData.frequency} onChange={(e) => setFormData({...formData, frequency: e.target.value})} placeholder="e.g., Weekly, Monthly" required />
          <FormInput label="Next Due Date" type="date" value={formData.next_due_date} onChange={(e) => setFormData({...formData, next_due_date: e.target.value})} required />
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md" rows={3} />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700">Save</button>
        </form>
      </Modal>
    </div>
  )
}
