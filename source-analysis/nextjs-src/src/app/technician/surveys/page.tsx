'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function SurveysPage() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [surveys, setSurveys] = useState([])
  const [formData, setFormData] = useState({ asset_id: '', produced_qty: '', runtime_hours: '', cycles: '', notes: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [assignRes, surveyRes] = await Promise.all([
      api.get(`/assignments?user_id=${user?.id}&status=active`),
      api.get(`/surveys?inspector_id=${user?.id}`)
    ])
    setAssignments(assignRes.data.data || [])
    setSurveys(surveyRes.data.data || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/surveys', formData)
    fetchData()
    setFormData({ asset_id: '', produced_qty: '', runtime_hours: '', cycles: '', notes: '' })
  }

  return (
    <div>
      <h1 className="text-lg font-semibold mb-6">Production Survey</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Submit Survey</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Equipment</label>
              <select value={formData.asset_id} onChange={(e) => setFormData({...formData, asset_id: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-md" required>
                <option value="">Select Equipment</option>
                {assignments.map((a: any) => <option key={a.id} value={a.asset_id}>{a.equipment_name}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Produced Quantity</label>
              <input type="number" step="0.01" value={formData.produced_qty} onChange={(e) => setFormData({...formData, produced_qty: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-md" required />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Runtime Hours</label>
              <input type="number" step="0.1" value={formData.runtime_hours} onChange={(e) => setFormData({...formData, runtime_hours: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-md" required />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Cycles</label>
              <input type="number" value={formData.cycles} onChange={(e) => setFormData({...formData, cycles: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-md" />
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1">Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full px-2.5 py-1.5 text-sm border rounded-md" rows={3} />
            </div>
            <button type="submit" className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md w-full">Submit Survey</button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Recent Surveys</h2>
          <div className="space-y-3">
            {surveys.slice(0, 5).map((s: any) => (
              <div key={s.id} className="border-b pb-3">
                <div className="font-medium">{s.equipment_name}</div>
                <div className="text-sm text-gray-600">Qty: {s.produced_qty} | Runtime: {s.runtime_hours}h | Cycles: {s.cycles}</div>
                <div className="text-xs text-gray-500">{formatDate(s.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
