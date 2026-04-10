'use client'
import { useState, useEffect } from 'react'
import DataTable from '@/components/DataTable'
import Modal from '@/components/Modal'
import FormInput from '@/components/FormInput'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission } from '@/utils/permissions'
import api from '@/lib/api'
import { showToast } from '@/lib/toast'
import { TableSkeleton } from '@/components/Skeleton'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import BulkActions, { useBulkSelection } from '@/components/BulkActions'

export default function ProductionPage() {
  const [productions, setProductions] = useState([])
  const [filteredProductions, setFilteredProductions] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ production_order: '', product_name: '', quantity: '', start_date: '', end_date: '', status: 'planned' })
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const itemsPerPage = 10
  const paginatedData = filteredProductions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(paginatedData)

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? productions.filter((p: any) => selectedIds.includes(p.id)) : productions
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map((p: any) => Object.values(p).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `production-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    showToast.success('Production data exported')
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} orders?`)) return
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} orders...`)
    try {
      await Promise.all(selectedIds.map(id => api.delete(`/production/${id}`)
      showToast.dismiss(loadingToast)
      showToast.success(`${selectedIds.length} orders deleted`)
      clearSelection()
      fetchProductions()
    } catch (error) {
      showToast.dismiss(loadingToast)
      showToast.error('Failed to delete orders')
    }
  }

  useKeyboardShortcuts({
    onNew: () => { resetForm(); setIsModalOpen(true) },
    onExport: handleExport,
    onClose: () => { setIsModalOpen(false); resetForm() }
  })

  useEffect(() => {
    fetchProductions()
  }, [])

  useEffect(() => {
    const filtered = productions.filter((prod: any) =>
      prod.production_order?.toLowerCase().includes(search.toLowerCase()) ||
      prod.product_name?.toLowerCase().includes(search.toLowerCase())
    )
    setFilteredProductions(filtered)
  }, [search, productions])

  const fetchProductions = async () => {
    try {
      const res = await api.get('/production')
      setProductions((res.data as any)?.data || [])
    } catch (err) {
      showToast.error('Failed to fetch production orders')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const loadingToast = showToast.loading(editingId ? 'Updating...' : 'Creating...')
    try {
      if (editingId) {
        await api.put(`/production/${editingId}`, formData)
        showToast.dismiss(loadingToast)
        showToast.success('Production order updated')
      } else {
        await api.post('/production', formData)
        showToast.dismiss(loadingToast)
        showToast.success('Production order created')
      }
      setIsModalOpen(false)
      fetchProductions()
      resetForm()
    } catch (err) {
      showToast.dismiss(loadingToast)
      showToast.error('Failed to save production order')
    }
  }

  const handleEdit = (row: any) => {
    setEditingId(row.id)
    setFormData({ production_order: row.production_order, product_name: row.product_name, quantity: row.quantity, start_date: row.start_date, end_date: row.end_date, status: row.status })
    setIsModalOpen(true)
  }

  const handleDelete = async (row: any) => {
    if (confirm('Delete this production order?')) {
      const loadingToast = showToast.loading('Deleting...')
      try {
        await api.delete(`/production/${row.id}`)
        showToast.dismiss(loadingToast)
        showToast.success('Production order deleted')
        fetchProductions()
      } catch (error) {
        showToast.dismiss(loadingToast)
        showToast.error('Failed to delete')
      }
    }
  }

  const resetForm = () => {
    setFormData({ production_order: '', product_name: '', quantity: '', start_date: '', end_date: '', status: 'planned' })
    setEditingId(null)
  }

  const columns = [
    { key: 'production_order', label: 'Order #' },
    { key: 'product_name', label: 'Product' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'status', label: 'Status', render: (val: string) => <span className={`px-2 py-1 rounded text-xs ${val === 'planned' ? 'bg-blue-100 text-blue-800' : val === 'in-progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{val}</span> },
  ]

  const totalPages = Math.ceil(filteredProductions.length / itemsPerPage)

  if (loading) return <TableSkeleton rows={10} />

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-semibold">Production Orders</h1>
        <div className="flex gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search production..." />
          {hasPermission(user?.role || '', 'create') && (
            <button onClick={() => { resetForm(); setIsModalOpen(true) }} className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700">
              Create Order
            </button>
          )}
        </div>
      </div>
      <BulkActions
        selectedIds={selectedIds}
        totalCount={paginatedData.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleExport}
      />

      <div className="bg-white rounded-lg shadow">
        <DataTable 
          columns={columns} 
          data={paginatedData} 
          onEdit={hasPermission(user?.role || '', 'update') ? handleEdit : undefined}
          onDelete={hasPermission(user?.role || '', 'delete') ? handleDelete : undefined}
        />
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm() }} title={editingId ? 'Edit Production Order' : 'Create Production Order'}>
        <form onSubmit={handleSubmit}>
          <FormInput label="Production Order #" value={formData.production_order} onChange={(e) => setFormData({...formData, production_order: e.target.value})} required />
          <FormInput label="Product Name" value={formData.product_name} onChange={(e) => setFormData({...formData, product_name: e.target.value})} required />
          <FormInput label="Quantity" type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} required />
          <FormInput label="Start Date" type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
          <FormInput label="End Date" type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} required />
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md">
              <option value="planned">Planned</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700">Save</button>
        </form>
      </Modal>
    </div>
  )
}
