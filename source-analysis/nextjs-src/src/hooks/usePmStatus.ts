import { useState, useEffect } from 'react'
import api from '@/lib/api'

export function usePmStatus(assetId: number | null) {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const fetchStatus = async () => {
    if (!assetId) return
    setLoading(true)
    try {
      const res = await api.get(`/assets/${assetId}/pm-status`)
      setStatus(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [assetId])

  return { status, loading, refetch: fetchStatus }
}
