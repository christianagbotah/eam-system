interface KPICardProps {
  title: string
  value: string | number
  trend?: number
  format?: 'number' | 'currency' | 'percent' | 'hours'
  icon?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

export default function KPICard({ title, value, trend, format = 'number', icon, color = 'blue' }: KPICardProps) {
  const formatValue = () => {
    if (format === 'currency') return `$${Number(value).toLocaleString()}`
    if (format === 'percent') return `${value}%`
    if (format === 'hours') return `${value}h`
    return Number(value).toLocaleString()
  }

  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className={`bg-gradient-to-r ${colors[color]} p-4`}>
        <div className="flex items-center justify-between text-white">
          <h3 className="text-sm font-medium opacity-90">{title}</h3>
          {icon && <span className="text-2xl">{icon}</span>}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold text-gray-900">{formatValue()}</span>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-sm font-medium ${
              trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
