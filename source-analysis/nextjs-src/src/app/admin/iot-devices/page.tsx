'use client'
import { useState, useEffect } from 'react'
import { iotService } from '@/services/iot/iotService'
import Modal from '@/components/Modal'
import { showToast } from '@/lib/toast'
import { TableSkeleton } from '@/components/Skeleton'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import BulkActions, { useBulkSelection } from '@/components/BulkActions'
import RBACGuard from '@/components/RBACGuard'

function IoTDevicesContent() {
  const [devices, setDevices] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingDevice, setEditingDevice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(devices)

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? devices.filter(d => selectedIds.includes(d.id)) : devices
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map(d => Object.values(d).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `iot-devices-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    showToast.success('Exported successfully')
  }

  useKeyboardShortcuts({
    onNew: () => { setEditingDevice(null); setFormData({ device_id: '', asset_id: '', device_type: 'vibration_sensor', status: 'active' }); setShowModal(true) },
    onExport: handleExport,
    onClose: () => setShowModal(false)
  })
  const [formData, setFormData] = useState({
    device_id: '',
    asset_id: '',
    device_type: 'vibration_sensor',
    status: 'active'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [devicesData, assetsData] = await Promise.all([
        iotService.getDevices(),
        fetch(`/api/v1/eam/equipment`).then(r => r.json())
      ])
      setDevices(devicesData.data || [])
      setAssets(assetsData.data || [])
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const loadingToast = showToast.loading(editingDevice ? 'Updating device...' : 'Creating device...')
    try {
      if (editingDevice) {
        await fetch(`/api/v1/eam/iot/devices/${editingDevice.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        showToast.dismiss(loadingToast)
        showToast.success('Device updated successfully!')
      } else {
        await fetch(`/api/v1/eam/iot/devices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        showToast.dismiss(loadingToast)
        showToast.success('Device created successfully!')
      }
      setShowModal(false)
      setEditingDevice(null)
      setFormData({ device_id: '', asset_id: '', device_type: 'vibration_sensor', status: 'active' })
      loadData()
    } catch (error) {
      showToast.dismiss(loadingToast)
      showToast.error('Failed to save device')
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} devices?`)) return
    const loadingToast = showToast.loading(`Deleting ${selectedIds.length} devices...`)
    try {
      await Promise.all(selectedIds.map(id => fetch(`/api/v1/eam/iot/devices/${id}`, { method: 'DELETE' })))
      showToast.dismiss(loadingToast)
      showToast.success(`${selectedIds.length} devices deleted`)
      clearSelection()
      loadData()
    } catch (error) {
      showToast.dismiss(loadingToast)
      showToast.error('Failed to delete devices')
    }
  }

  const handleEdit = (device: any) => {
    setEditingDevice(device)
    setFormData({
      device_id: device.device_id,
      asset_id: device.asset_id,
      device_type: device.device_type,
      status: device.status
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this device?')) return
    const loadingToast = showToast.loading('Deleting...')
    try {
      await fetch(`/api/v1/eam/iot/devices/${id}`, { method: 'DELETE' })
      showToast.dismiss(loadingToast)
      showToast.success('Device deleted')
      loadData()
    } catch (error) {
      showToast.dismiss(loadingToast)
      showToast.error('Failed to delete device')
    }
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">IoT Devices</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700">📥 Export</button>
          <button
            onClick={() => {
              setEditingDevice(null)
              setFormData({ device_id: '', asset_id: '', device_type: 'vibration_sensor', status: 'active' })
              setShowModal(true)
            }}
            className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md hover:bg-blue-700"
          >
            + Add Device
          </button>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalCount={devices.length}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkExport={handleExport}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <TableSkeleton rows={10} />
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  <input type="checkbox" checked={selectedIds.length === devices.length && devices.length > 0} onChange={selectAll} />
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Device ID</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Seen</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={isSelected(device.id)} onChange={() => toggleSelect(device.id)} />
                  </td>
                  <td className="px-6 py-4 font-medium">{device.device_id}</td>
                <td className="px-6 py-4">{device.asset_id}</td>
                <td className="px-6 py-4">{device.device_type}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {device.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-sm">{device.last_seen ? formatDateTime(device.last_seen) : 'Never'}</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleEdit(device)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                  <button onClick={() => handleDelete(device.id)} className="text-red-600 hover:text-red-800">Delete</button>
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingDevice ? 'Edit Device' : 'Add Device'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Device ID</label>
            <input
              type="text"
              value={formData.device_id}
              onChange={(e) => setFormData({...formData, device_id: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Asset</label>
            <select
              value={formData.asset_id}
              onChange={(e) => setFormData({...formData, asset_id: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">Select Asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Device Type</label>
            <select
              value={formData.device_type}
              onChange={(e) => setFormData({...formData, device_type: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="vibration_sensor">Vibration Sensor</option>
              <option value="temperature_sensor">Temperature Sensor</option>
              <option value="pressure_sensor">Pressure Sensor</option>
              <option value="energy_meter">Energy Meter</option>
              <option value="production_counter">Production Counter</option>
              <option value="rfid_reader">RFID Reader</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="error">Error</option>
            </select>
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
            {editingDevice ? 'Update' : 'Create'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

export default function IoTDevicesPage() {
  return (
    <RBACGuard module="iot_devices" action="view">
      <IoTDevicesContent />
    </RBACGuard>
  )
}
