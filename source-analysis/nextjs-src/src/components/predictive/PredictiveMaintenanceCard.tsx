'use client'
import { useState, useEffect } from 'react'
import { predictiveService } from '@/services/predictive/predictiveService'
import { toast } from '@/lib/toast'

interface PredictiveData {
  asset_id: string
  asset_name: string
  failure_probability: number
  predicted_failure_date: string
  recommended_action: string
  confidence: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
}

export default function PredictiveMaintenanceCard({ assetId }: { assetId: string }) {
  const [prediction, setPrediction] = useState<PredictiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadPrediction()
  }, [assetId])

  const loadPrediction = async () => {
    try {
      const data = await predictiveService.getAssetPrediction(assetId)
      setPrediction(data.data)
    } catch (error) {
      console.error('Failed to load prediction', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkOrder = async () => {
    if (!prediction) return
    setCreating(true)
    try {
      await predictiveService.createPredictiveWorkOrder(assetId, prediction)
      toast.success('Preventive work order created')
    } catch (error) {
      toast.error('Failed to create work order')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="animate-pulse bg-gray-200 h-48 rounded-lg" />

  const riskColors = {
    low: 'from-green-500 to-green-600',
    medium: 'from-yellow-500 to-yellow-600',
    high: 'from-orange-500 to-orange-600',
    critical: 'from-red-500 to-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className={`bg-gradient-to-r ${riskColors[prediction?.risk_level || 'low']} p-4 text-white`}>
        <h3 className="font-bold text-lg">Predictive Maintenance Alert</h3>
        <p className="text-sm opacity-90">AI-Powered Failure Prediction</p>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Failure Probability</span>
          <span className="text-3xl font-bold text-red-600">{prediction?.failure_probability}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`bg-gradient-to-r ${riskColors[prediction?.risk_level || 'low']} h-3 rounded-full transition-all`}
            style={{ width: `${prediction?.failure_probability}%` }}
          />
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Predicted Failure Date</span>
            <span className="font-medium">{new Date(prediction?.predicted_failure_date || '').toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Model Confidence</span>
            <span className="font-medium">{prediction?.confidence}%</span>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
          <p className="text-sm font-medium text-yellow-800">Recommended Action</p>
          <p className="text-sm text-yellow-700 mt-1">{prediction?.recommended_action}</p>
        </div>

        <button 
          onClick={handleCreateWorkOrder}
          disabled={creating}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create Preventive Work Order'}
        </button>
      </div>
    </div>
  )
}
