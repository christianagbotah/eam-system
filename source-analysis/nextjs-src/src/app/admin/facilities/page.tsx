'use client'
import { useState, useEffect } from 'react'
import { alert } from '@/components/AlertModalProvider'
import FormModal from '@/components/ui/FormModal'
import FormInput from '@/components/FormInput'
import SearchBar from '@/components/SearchBar'
import Pagination from '@/components/Pagination'
import { useAuth } from '@/contexts/AuthContext'
import { hasPermission } from '@/utils/permissions'
import api from '@/lib/api'
import { TableSkeleton } from '@/components/Skeleton'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import BulkActions, { useBulkSelection } from '@/components/BulkActions'
import QRCodeGenerator from '@/components/QRCodeGenerator'
import RBACGuard from '@/components/RBACGuard'


function FacilitiesContent() {
  const [facilities, setFacilities] = useState([])
  const [filteredFacilities, setFilteredFacilities] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedFacility, setSelectedFacility] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ facility_code: '', facility_name: '', facility_type: 'plant', address_line1: '', city: '', country_code: '', timezone: 'UTC', latitude: '', longitude: '', status: 'active' })
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {}
  const itemsPerPage = 10
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(facilities)

  useKeyboardShortcuts({
    onNew: () => { resetForm(); setIsModalOpen(true); },
    onSave: () => handleSubmit(new Event('submit') as any),
    onExport: () => handleExport(),
    onClose: () => { setIsModalOpen(false); setShowQRModal(false); }
  })

  useEffect(() => {
    fetchFacilities()
  }, [])

  useEffect(() => {
    const filtered = facilities.filter((facility: any) =>
      facility.facility_name?.toLowerCase().includes(search.toLowerCase()) ||
      facility.facility_code?.toLowerCase().includes(search.toLowerCase()) ||
      facility.address_line1?.toLowerCase().includes(search.toLowerCase()) ||
      facility.city?.toLowerCase().includes(search.toLowerCase())
    )
    setFilteredFacilities(filtered)
  }, [search, facilities])

  const fetchFacilities = async () => {
    try {
      const res = await api.get('/facilities')
      setFacilities((res.data as any)?.data || [])
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await api.put(`/facilities/${editingId}`, formData)
        alert.success('Success', 'Facility updated successfully!')
      } else {
        await api.post('/facilities', formData)
        alert.success('Success', 'Facility created successfully!')
      }
      setIsModalOpen(false)
      fetchFacilities()
      resetForm()
    } catch (err) {
      alert.error('Error', 'Failed to save facility')
      console.error(err)
    }
  }

  const handleEdit = (row: any) => {
    setEditingId(row.id)
    setFormData({ facility_code: row.facility_code, facility_name: row.facility_name, facility_type: row.facility_type || 'plant', address_line1: row.address_line1 || '', city: row.city || '', country_code: row.country_code || '', timezone: row.timezone || 'UTC', latitude: row.latitude || '', longitude: row.longitude || '', status: row.status })
    setIsModalOpen(true)
  }

  const handleDelete = (row: any) => {
    alert.confirm(
      'Delete Facility',
      `Are you sure you want to delete "${row.facility_name}"? This action cannot be undone.`,
      async () => {
        try {
          await api.delete(`/facilities/${row.id}`)
          alert.success('Success', 'Facility deleted successfully')
          fetchFacilities()
        } catch (err) {
          alert.error('Error', 'Failed to delete facility')
          console.error(err)
        }
      }
    )
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    alert.confirm(
      'Delete Multiple Facilities',
      `Are you sure you want to delete ${selectedIds.length} facilities? This action cannot be undone.`,
      async () => {
        try {
          await Promise.all(selectedIds.map(id => api.delete(`/facilities/${id}`)))
          alert.success('Success', `${selectedIds.length} facilities deleted successfully`)
          clearSelection()
          fetchFacilities()
        } catch (err) {
          alert.error('Error', 'Failed to delete facilities')
          console.error(err)
        }
      }
    )
  }

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? facilities.filter((f: any) => selectedIds.includes(f.id))
      : filteredFacilities
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map((f: any) => Object.values(f).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `facilities-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    alert.success('Success', 'Facilities exported successfully')
  }

  const handleShowQR = (facility: any) => {
    setSelectedFacility(facility)
    setShowQRModal(true)
  }

  const resetForm = () => {
    setFormData({ facility_code: '', facility_name: '', facility_type: 'plant', address_line1: '', city: '', country_code: '', timezone: 'UTC', latitude: '', longitude: '', status: 'active' })
    setEditingId(null)
  }

  const columns = [
    { 
      key: 'select', 
      label: <input type="checkbox" checked={selectedIds.length === filteredFacilities.length && filteredFacilities.length > 0} onChange={selectAll} />,
      render: (val: any, row: any) => <input type="checkbox" checked={isSelected(row.id)} onChange={() => toggleSelect(row.id)} />
    },
    { key: 'facility_code', label: 'Code' },
    { key: 'facility_name', label: 'Name' },
    { key: 'address_line1', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'status', label: 'Status', render: (val: string) => <span className={`px-2 py-1 rounded text-xs ${val === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{val}</span> },
    { key: 'qr', label: 'QR', render: (val: any, row: any) => <button onClick={() => handleShowQR(row)} className="text-blue-600 hover:text-blue-800">📱 QR</button> },
  ]

  const paginatedData = filteredFacilities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(filteredFacilities.length / itemsPerPage)

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-lg font-semibold">Facilities</h1>
            <p className="text-xs text-gray-600 text-sm mt-0.5">Press Ctrl+N to add, Ctrl+E to export, Ctrl+K to search</p>
          </div>
          <div className="flex gap-2">
            <SearchBar value={search} onChange={setSearch} placeholder="Search facilities..." />
            <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">📥 Export</button>
            <button onClick={() => { resetForm(); setIsModalOpen(true) }} className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700">
              ➕ Add Facility
            </button>
          </div>
        </div>

        <BulkActions
          selectedIds={selectedIds}
          totalCount={filteredFacilities.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleExport}
        />

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="divide-y divide-gray-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                      <div>
                        <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-48 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Facilities Yet</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">Create your first facility to start managing your locations and operations</p>
            <button onClick={() => { resetForm(); setIsModalOpen(true) }} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors">
              + Create First Facility
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Facilities</h3>
                <span className="text-sm text-gray-500">{filteredFacilities.length} facilities</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {paginatedData.map((facility: any) => (
                <div key={facility.id} className="p-6 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input 
                        type="checkbox" 
                        checked={isSelected(facility.id)} 
                        onChange={() => toggleSelect(facility.id)} 
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="min-w-20 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs px-2 whitespace-nowrap">
                        {facility.facility_code || 'FC'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="text-lg font-semibold text-gray-900">{facility.facility_name}</h4>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {facility.facility_type?.replace('_', ' ').toUpperCase() || 'FACILITY'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            facility.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {facility.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          {facility.address_line1 && (
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{facility.address_line1}</span>
                            </div>
                          )}
                          {facility.city && (
                            <div className="flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                              </svg>
                              <span>{facility.city}</span>
                            </div>
                          )}
                          {facility.country_code && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                              {facility.country_code}
                            </span>
                          )}
                        </div>
                        {facility.timezone && (
                          <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{facility.timezone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleShowQR(facility)}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Show QR Code"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleEdit(facility)}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDelete(facility)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>
        )}
        <FormModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm() }} title={editingId ? 'Edit Facility' : 'Add Facility'} size="xl">
          <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              <FormInput label="Facility Code" value={formData.facility_code} onChange={(e) => setFormData({...formData, facility_code: e.target.value})} required />
              <FormInput label="Facility Name" value={formData.facility_name} onChange={(e) => setFormData({...formData, facility_name: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormInput label="Address" value={formData.address_line1} onChange={(e) => setFormData({...formData, address_line1: e.target.value})} />
              <FormInput label="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Facility Type</label>
              <select value={formData.facility_type} onChange={(e) => setFormData({...formData, facility_type: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md">
                <option value="plant">Plant</option>
                <option value="warehouse">Warehouse</option>
                <option value="office">Office</option>
                <option value="distribution_center">Distribution Center</option>
                <option value="service_center">Service Center</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Country Code (ISO 3166-1)</label>
                <input type="text" maxLength={2} placeholder="US" value={formData.country_code} onChange={(e) => setFormData({...formData, country_code: e.target.value.toUpperCase()})} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md" />
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
                <select value={formData.timezone} onChange={(e) => setFormData({...formData, timezone: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md">
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Chicago">America/Chicago</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                  <option value="Asia/Shanghai">Asia/Shanghai</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <FormInput label="Latitude" type="number" step="0.000001" placeholder="40.7128" value={formData.latitude} onChange={(e) => setFormData({...formData, latitude: e.target.value})} />
              <FormInput label="Longitude" type="number" step="0.000001" placeholder="-74.0060" value={formData.longitude} onChange={(e) => setFormData({...formData, longitude: e.target.value})} />
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setIsModalOpen(false); resetForm() }} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300">
                Cancel
              </button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </FormModal>

        <FormModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="Facility QR Code" size="md">
          {selectedFacility && (
            <div className="text-center">
              <QRCodeGenerator
                value={`FACILITY-${selectedFacility.id}`}
                label={selectedFacility.facility_name}
                size={256}
              />
              <p className="mt-4 text-sm text-gray-600">Scan this QR code to quickly access facility details</p>
            </div>
          )}
        </FormModal>
      </div>
    </>
  )
}

export default function FacilitiesPage() {
  return (
    <RBACGuard module="facilities" action="view">
      <FacilitiesContent />
    </RBACGuard>
  )
}
