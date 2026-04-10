import { useState, useEffect } from 'react'
import * as assignmentService from '@/services/assignmentService'

export function useAssignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchAssignments = async (params?: any) => {
    setLoading(true)
    try {
      const res = await assignmentService.fetchAssignments(params)
      setAssignments(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createAssignment = async (data: any) => {
    await assignmentService.createAssignment(data)
    await fetchAssignments()
  }

  const endAssignment = async (id: number) => {
    await assignmentService.endAssignment(id)
    await fetchAssignments()
  }

  useEffect(() => {
    fetchAssignments()
  }, [])

  return { assignments, loading, createAssignment, endAssignment, refetch: fetchAssignments }
}
