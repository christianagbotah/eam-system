'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface AssetSidebarProps {
  isOpen: boolean
  onClose: () => void
  assetId: string
  partName: string
}

export default function AssetSidebar({ isOpen, onClose, assetId, partName }: AssetSidebarProps) {
  const [asset, setAsset] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pmSchedules, setPmSchedules] = useState<any[]>([])

  useEffect(() => {
    if (isOpen && assetId) {
      fetchAssetDetails()
    }
  }, [isOpen, assetId])

  const fetchAssetDetails = async () => {
    if (!assetId || isNaN(Number(assetId))) {
      setAsset(null)
      return
    }
    
    setLoading(true)
    try {
      const res = await api.get(`/equipment/${assetId}`)
      setAsset(res.data.data)
      
      const pmRes = await api.get(`/pm-schedules?equipment_id=${assetId}`)
      setPmSchedules(pmRes.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignPM = async () => {
    try {
      await api.post('/pm-schedules', {
        equipment_id: assetId,
        pm_code: `PM-${Date.now()}`,
        frequency: 'Monthly',
        next_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: `PM task for ${partName}`
      })
      fetchAssetDetails()
    } catch (err) {
      console.error(err)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto animate-slideIn">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Asset Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : !assetId || isNaN(Number(assetId)) ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">This 3D part is not linked to an equipment record.</p>
            <p className="text-sm text-gray-500">Part Name: <span className="font-medium">{partName}</span></p>
            <p className="text-sm text-gray-500">Part ID: <span className="font-medium">{assetId}</span></p>
          </div>
        ) : asset ? (
          <>
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">{partName}</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Code:</span> {asset.equipment_code}</div>
                <div><span className="font-medium">Name:</span> {asset.equipment_name}</div>
                <div><span className="font-medium">Manufacturer:</span> {asset.manufacturer}</div>
                <div><span className="font-medium">Model:</span> {asset.model}</div>
                <div>
                  <span className="font-medium">Status:</span>{' '}
                  <span className={`px-2 py-1 rounded text-xs ${
                    asset.status === 'operational' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {asset.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3">PM Schedules</h3>
              {pmSchedules.length > 0 ? (
                <div className="space-y-2">
                  {pmSchedules.map((pm) => (
                    <div key={pm.id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="font-medium">{pm.pm_code}</div>
                      <div className="text-sm text-gray-600">Frequency: {pm.frequency}</div>
                      <div className="text-sm text-gray-600">Next Due: {pm.next_due_date}</div>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${
                        pm.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {pm.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No PM schedules found</p>
              )}
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => handleAssignPM()}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
              >
                Assign PM Task
              </button>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">
                Create Work Order
              </button>
              <button className="w-full border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50">
                View History
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-500">No asset data available</p>
        )}
      </div>
    </div>
  )
}
