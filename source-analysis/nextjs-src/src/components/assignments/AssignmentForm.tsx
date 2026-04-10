'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import SearchableSelect from '../SearchableSelect'

interface AssignmentFormProps {
  onSubmit: (data: any) => void
}

export default function AssignmentForm({ onSubmit }: AssignmentFormProps) {
  const [assets, setAssets] = useState([])
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [shifts, setShifts] = useState([])
  const [assignType, setAssignType] = useState('user')
  const [formData, setFormData] = useState({
    asset_id: '',
    assignee_user_id: '',
    assignee_group_id: '',
    shift_id: '',
    start_at: '',
    end_at: '',
    note: ''
  })

  useEffect(() => {
    Promise.all([
      api.get('/equipment'),
      api.get('/users?role=operator'),
      api.get('/operator-groups'),
      api.get('/shifts')
    ]).then(([assetRes, userRes, groupRes, shiftRes]) => {
      setAssets(assetRes.data.data || [])
      setUsers(userRes.data.data || [])
      setGroups(groupRes.data.data || [])
      setShifts(shiftRes.data.data || [])
    })
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...formData }
    if (assignType === 'user') {
      delete data.assignee_group_id
    } else {
      delete data.assignee_user_id
    }
    onSubmit(data)
    setFormData({ asset_id: '', assignee_user_id: '', assignee_group_id: '', shift_id: '', start_at: '', end_at: '', note: '' })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Create Assignment</h2>
      
      <div className="mb-4">
        <SearchableSelect
          value={formData.asset_id}
          onChange={(val) => setFormData({...formData, asset_id: val})}
          options={assets.map((a: any) => ({ id: a.id, label: a.equipment_name }))}
          placeholder="Select Asset"
          label="Asset"
          required
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Assign To</label>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center">
            <input type="radio" value="user" checked={assignType === 'user'} onChange={(e) => setAssignType(e.target.value)} className="mr-2" />
            Single Operator
          </label>
          <label className="flex items-center">
            <input type="radio" value="group" checked={assignType === 'group'} onChange={(e) => setAssignType(e.target.value)} className="mr-2" />
            Group
          </label>
        </div>
        {assignType === 'user' ? (
          <SearchableSelect
            value={formData.assignee_user_id}
            onChange={(val) => setFormData({...formData, assignee_user_id: val})}
            options={users.map((u: any) => ({ id: u.id, label: u.username, sublabel: u.role }))}
            placeholder="Select Operator"
            required
          />
        ) : (
          <SearchableSelect
            value={formData.assignee_group_id}
            onChange={(val) => setFormData({...formData, assignee_group_id: val})}
            options={groups.map((g: any) => ({ id: g.id, label: g.name }))}
            placeholder="Select Group"
            required
          />
        )}
      </div>

      <div className="mb-4">
        <SearchableSelect
          value={formData.shift_id}
          onChange={(val) => setFormData({...formData, shift_id: val})}
          options={shifts.map((s: any) => ({ id: s.id, label: s.shift_name }))}
          placeholder="Select Shift (Optional)"
          label="Shift"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date/Time</label>
          <input type="datetime-local" value={formData.start_at} onChange={(e) => setFormData({...formData, start_at: e.target.value})} className="w-full px-3 py-2 border rounded-md" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date/Time</label>
          <input type="datetime-local" value={formData.end_at} onChange={(e) => setFormData({...formData, end_at: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} className="w-full px-3 py-2 border rounded-md" rows={3} />
      </div>

      <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Create Assignment</button>
    </form>
  )
}
