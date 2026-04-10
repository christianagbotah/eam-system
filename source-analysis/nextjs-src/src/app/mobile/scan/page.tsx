'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/toast'

export default function ScanPage() {
  const [scannedData, setScannedData] = useState<any>(null)
  const [manualInput, setManualInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setScanning(true)
      }
    } catch (error) {
      toast.error('Camera access denied')
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      setScanning(false)
    }
  }

  const handleManualLookup = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/v1/eam/equipment?search=${manualInput}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = res.data
      if (data.data && data.data.length > 0) {
        setScannedData(data.data[0])
      } else {
        toast.error('Asset not found')
      }
    } catch (error) {
      toast.error('Failed to lookup asset')
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-lg p-6 shadow text-center">
        <div className="text-6xl mb-4">📷</div>
        <h2 className="text-lg font-bold mb-2">Scan Asset QR Code</h2>
        <p className="text-sm text-gray-600 mb-4">Position QR code within frame</p>
        {!scanning ? (
          <div className="border-4 border-dashed border-gray-300 rounded-lg h-64 flex items-center justify-center mb-4">
            <span className="text-gray-400">Camera off</span>
          </div>
        ) : (
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg mb-4" />
        )}
        <button
          onClick={scanning ? stopCamera : startCamera}
          className={`w-full py-3 rounded-lg font-semibold ${scanning ? 'bg-red-600' : 'bg-blue-600'} text-white`}
        >
          {scanning ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 shadow">
        <h3 className="font-bold mb-3">Manual Lookup</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter Asset ID"
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={handleManualLookup}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Search
          </button>
        </div>
      </div>

      {scannedData && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 bg-green-50 border-b">
            <h3 className="font-bold text-green-800">Asset Found</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Asset ID:</span>
              <span className="font-medium">{scannedData.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{scannedData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                {scannedData.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">{scannedData.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Maintenance:</span>
              <span className="font-medium">{scannedData.last_maintenance}</span>
            </div>
          </div>
          <div className="p-4 border-t space-y-2">
            <button onClick={() => router.push(`/admin/assets`)} className="w-full bg-blue-600 text-white py-2 rounded">
              View Details
            </button>
            <button onClick={() => router.push(`/mobile/work-orders`)} className="w-full bg-yellow-600 text-white py-2 rounded">
              Create Work Order
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
