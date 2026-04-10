'use client'
import { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  children: ReactNode
  actions?: ReactNode
}

export default function ChartCard({ title, children, actions }: ChartCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{title}</h3>
        {actions && <div>{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}
