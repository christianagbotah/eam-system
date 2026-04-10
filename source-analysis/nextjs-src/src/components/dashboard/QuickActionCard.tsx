import Link from 'next/link'

interface QuickActionCardProps {
  title: string
  description: string
  icon: string
  href: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo'
}

export default function QuickActionCard({ title, description, icon, href, color = 'blue' }: QuickActionCardProps) {
  const colors = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    yellow: 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
    red: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    indigo: 'from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
  }

  return (
    <Link href={href} className={`block bg-gradient-to-br ${colors[color]} text-white rounded-lg shadow p-6 hover:shadow-xl transition-all transform hover:-translate-y-1`}>
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm opacity-90">{description}</p>
    </Link>
  )
}
