'use client'
import { useIoTData } from '@/hooks/useIoTData'

interface RealTimeChartProps {
  assetId: string
  metricType: string
  title: string
  unit?: string
  threshold?: number
}

export default function RealTimeChart({ assetId, metricType, title, unit = '', threshold }: RealTimeChartProps) {
  const { data, connected, loading } = useIoTData(assetId, metricType)

  if (loading) return <div className="animate-pulse bg-gray-200 h-64 rounded-lg" />

  const maxValue = Math.max(...data.map(d => d.value), threshold || 0)
  const minValue = Math.min(...data.map(d => d.value), 0)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">{title}</h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-600">{connected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="relative h-48">
        <svg className="w-full h-full">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(y => (
            <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="#e5e7eb" strokeWidth="1" />
          ))}

          {/* Threshold line */}
          {threshold && (
            <line
              x1="0"
              y1={`${100 - ((threshold - minValue) / (maxValue - minValue)) * 100}%`}
              x2="100%"
              y2={`${100 - ((threshold - minValue) / (maxValue - minValue)) * 100}%`}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}

          {/* Data line */}
          {data.length > 1 && (
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              points={data.map((d, i) => {
                const x = (i / (data.length - 1)) * 100
                const y = 100 - ((d.value - minValue) / (maxValue - minValue)) * 100
                return `${x},${y}`
              }).join(' ')}
            />
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-gray-600">Current: <span className="font-bold">{data[data.length - 1]?.value.toFixed(2)} {unit}</span></span>
        {threshold && (
          <span className="text-red-600">Threshold: {threshold} {unit}</span>
        )}
      </div>
    </div>
  )
}
