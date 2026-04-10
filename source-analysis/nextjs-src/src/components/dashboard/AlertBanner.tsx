interface AlertBannerProps {
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  action?: { label: string; onClick: () => void }
}

export default function AlertBanner({ type, title, message, action }: AlertBannerProps) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  }

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  }

  return (
    <div className={`${styles[type]} border rounded-lg p-4 flex items-start gap-3`}>
      <span className="text-2xl">{icons[type]}</span>
      <div className="flex-1">
        <h4 className="font-bold">{title}</h4>
        <p className="text-sm mt-1">{message}</p>
      </div>
      {action && (
        <button onClick={action.onClick} className="px-4 py-2 bg-white rounded shadow-sm hover:shadow text-sm font-medium">
          {action.label}
        </button>
      )}
    </div>
  )
}
