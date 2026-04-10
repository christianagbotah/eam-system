'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSurveys } from '@/hooks/useSurveys'
import PMStatusWidget from '@/components/PMStatusWidget'
import api from '@/lib/api'

export default function NewSurveyPage() {
  const { user } = useAuth()
  const { createSurvey, loading: submitting } = useSurveys()
  const [assets, setAssets] = useState([])
  const [shifts, setShifts] = useState([])
  const [metrics, setMetrics] = useState([{ key: '', value: '' }])
  const [photos, setPhotos] = useState<File[]>([])
  const [showToast, setShowToast] = useState(false)
  const [formData, setFormData] = useState({
    asset_id: '',
    shift_id: '',
    produced_qty: '',
    runtime_hours: '',
    cycles: '',
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    const [assetRes, shiftRes] = await Promise.all([
      api.get(`/assignments?user_id=${user?.id}`),
      api.get('/shifts')
    ])
    const assignedAssets = assetRes.data.data || []
    setAssets(assignedAssets)
    setShifts(shiftRes.data.data || [])
    
    if (assignedAssets.length > 0) {
      setFormData(prev => ({ ...prev, asset_id: assignedAssets[0].asset_id }))
      fetchPMStatus(assignedAssets[0].asset_id)
    }
  }



  const handleAssetChange = (assetId: string) => {
    setFormData({ ...formData, asset_id: assetId })
  }

  const addMetric = () => {
    setMetrics([...metrics, { key: '', value: '' }])
  }

  const updateMetric = (index: number, field: string, value: string) => {
    const updated = [...metrics]
    updated[index] = { ...updated[index], [field]: value }
    setMetrics(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const additionalMetrics: any = {}
    metrics.forEach(m => {
      if (m.key && m.value) additionalMetrics[m.key] = m.value
    })

    const payload = {
      ...formData,
      additional_metrics: JSON.stringify(additionalMetrics)
    }

    const result = await createSurvey(payload, photos)
    
    if (result.success) {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      setFormData({ asset_id: formData.asset_id, shift_id: '', produced_qty: '', runtime_hours: '', cycles: '', notes: '' })
      setMetrics([{ key: '', value: '' }])
      setPhotos([])
    } else {
      alert('Failed to submit survey')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-lg font-semibold mb-6">New Production Survey</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Asset</label>
              <select value={formData.asset_id} onChange={(e) => handleAssetChange(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border rounded-md" required>
                <option value="">Select Asset</option>
                {assets.map((a: any) => <option key={a.id} value={a.asset_id}>{a.equipment_name}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Shift</label>
              <select value={formData.shift_id} onChange={(e) => setFormData({...formData, shift_id: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-md">
                <option value="">Select Shift</option>
                {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.shift_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1">Produced Qty</label>
                <input type="number" step="0.01" value={formData.produced_qty} onChange={(e) => setFormData({...formData, produced_qty: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-md" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Runtime Hours</label>
                <input type="number" step="0.1" value={formData.runtime_hours} onChange={(e) => setFormData({...formData, runtime_hours: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-md" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Cycles</label>
                <input type="number" value={formData.cycles} onChange={(e) => setFormData({...formData, cycles: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-md" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Additional Metrics</label>
              {metrics.map((m, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input type="text" placeholder="Key" value={m.key} onChange={(e) => updateMetric(i, 'key', e.target.value)} className="flex-1 px-2.5 py-1.5 text-sm border rounded-md" />
                  <input type="text" placeholder="Value" value={m.value} onChange={(e) => updateMetric(i, 'value', e.target.value)} className="flex-1 px-2.5 py-1.5 text-sm border rounded-md" />
                </div>
              ))}
              <button type="button" onClick={addMetric} className="text-blue-600 text-sm">+ Add Metric</button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-md" rows={3} />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Photos</label>
              <input 
                type="file" 
                accept="image/*" 
                multiple 
                onChange={(e) => setPhotos(Array.from(e.target.files || []))} 
                className="w-full px-2.5 py-1.5 text-sm border rounded-md" 
              />
              {photos.length > 0 && <div className="text-sm text-xs text-gray-600 mt-0.5">{photos.length} file(s) selected</div>}
            </div>

            <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 w-full disabled:bg-gray-400">
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </button>
          </form>
        </div>

        <div>
          {formData.asset_id && <PMStatusWidget assetId={parseInt(formData.asset_id)} />}
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
          Survey submitted successfully!
        </div>
      )
      </div>
    </div>
  )
}
