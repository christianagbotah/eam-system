import { useEffect, useState } from 'react'

interface IoTDataPoint {
  timestamp: string
  value: number
  metric_type: string
}

export function useIoTData(assetId: string, metricType?: string) {
  const [data, setData] = useState<IoTDataPoint[]>([])
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!assetId) return

    // Simulated WebSocket connection (replace with actual WebSocket in production)
    setConnected(true)
    setLoading(false)

    // Simulate real-time data updates
    const interval = setInterval(() => {
      const newPoint: IoTDataPoint = {
        timestamp: new Date().toISOString(),
        value: Math.random() * 100,
        metric_type: metricType || 'vibration'
      }
      setData(prev => [...prev.slice(-99), newPoint])
    }, 2000)

    return () => {
      clearInterval(interval)
      setConnected(false)
    }
  }, [assetId, metricType])

  return { data, connected, loading }
}
