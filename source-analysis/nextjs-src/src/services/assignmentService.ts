import api from '@/lib/api'

export async function createAssignment(payload: any) {
  return api.post('/assignments', payload)
}

export async function fetchAssignments(params?: any) {
  return api.get('/assignments', { params })
}

export async function endAssignment(id: number) {
  return api.delete(`/assignments/${id}`)
}

export async function updateAssignment(id: number, payload: any) {
  return api.put(`/assignments/${id}`, payload)
}
