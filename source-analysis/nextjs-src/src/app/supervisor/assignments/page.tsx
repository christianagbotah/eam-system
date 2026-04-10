'use client'
import { useState, useEffect } from 'react'
import api from '@/lib/api'
import Modal from '@/components/Modal'
import SearchableSelect from '@/components/SearchableSelect'

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([])
  const [equipment, setEquipment] = useState([])
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [assignType, setAssignType] = useState('user')
  const [formData, setFormData] = useState({ asset_id: '', assignee_user_id: '', assignee_group_id: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [assignRes, formDataRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/assignments/form-data')
      ])
      console.log('Assignments response:', assignRes.data)
      console.log('Form data response:', formDataRes.data)
      
      setAssignments(assignRes.data.data || [])
      const formData = formDataRes.data.data || {}
      console.log('Assets:', formData.assets)
      console.log('Team members:', formData.team_members)
      console.log('Groups:', formData.groups)
      
      setEquipment(formData.assets || [])
      setUsers(formData.team_members || [])
      setGroups(formData.groups || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/assignments', formData)
    setIsModalOpen(false)
    fetchData()
    setFormData({ asset_id: '', assignee_user_id: '', assignee_group_id: '' })
    setAssignType('user')
  }

  const handleEnd = async (id: number) => {
    if (confirm('End this assignment?')) {
      await api.delete(`/assignments/${id}`)
      fetchData()
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-semibold">Equipment Assignments</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md">
          Assign Equipment
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments found</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new equipment assignment.</p>
            <div className="mt-6">
              <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md">
                Create Assignment
              </button>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Equipment</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Operator</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assignments.map((a: any) => (
                <tr key={a.id}>
                  <td className="px-6 py-4">{a.equipment_name}</td>
                  <td className="px-6 py-4">{a.operator_name || a.group_name}</td>
                  <td className="px-6 py-4">{formatDate(a.start_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${!a.end_at ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {!a.end_at ? 'active' : 'ended'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {!a.end_at && (
                      <button onClick={() => handleEnd(a.id)} className="text-red-600 hover:text-red-800">End</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Equipment">
        <form onSubmit={handleSubmit}>
          <SearchableSelect
            value={formData.asset_id}
            onChange={(val) => setFormData({...formData, asset_id: val})}
            options={equipment.map((e: any) => ({ id: e.id.toString(), label: e.name }))}
            placeholder="Select Equipment"
            label="Equipment"
          />
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1">Assign To</label>
            <select value={assignType} onChange={(e) => setAssignType(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border rounded-md mb-2">
              <option value="user">Single Operator</option>
              <option value="group">Operator Group</option>
            </select>
            {assignType === 'user' ? (
              <>
                <SearchableSelect
                  value={formData.assignee_user_id}
                  onChange={(val) => setFormData({...formData, assignee_user_id: val, assignee_group_id: ''})}
                  options={users.map((u: any) => ({ id: u.id.toString(), label: u.username }))}
                  placeholder="Select Operator"
                />
                {formData.assignee_user_id && (() => {
                  const selectedUser = users.find((u: any) => u.id == formData.assignee_user_id);
                  const skills = selectedUser?.skills || [];
                  return skills.length > 0 ? (
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Operator Skills</label>
                      <div className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-700">
                        {skills.map((s: any) => s.skill_name).join(', ')}
                      </div>
                    </div>
                  ) : null;
                })()}
              </>
            ) : (
              <SearchableSelect
                value={formData.assignee_group_id}
                onChange={(val) => setFormData({...formData, assignee_group_id: val, assignee_user_id: ''})}
                options={groups.map((g: any) => ({ id: g.id.toString(), label: g.name }))}
                placeholder="Select Group"
              />
            )}
          </div>
          <button type="submit" className="bg-blue-600 text-white px-2 py-1 text-xs rounded-md">Assign</button>
        </form>
      </Modal>
    </div>
  )
}
