'use client'
import { useState, useEffect } from 'react'
import ChartCard from '@/components/dashboard/ChartCard'
import { showToast } from '@/lib/toast'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export default function ERPMappingPage() {
  const [mappings, setMappings] = useState<any[]>([])
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fieldValue, setFieldValue] = useState('')

  const handleExport = () => {
    const csv = [Object.keys(mappings[0] || {}).join(','), ...mappings.map(m => Object.values(m).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `erp-mappings-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    showToast.success('Mappings exported')
  }

  useKeyboardShortcuts({ onExport: handleExport })

  useEffect(() => {
    loadMappings()
  }, [])

  const loadMappings = () => {
    setMappings([
      { eam_field: 'asset_id', erp_field: 'EQUNR', entity: 'Asset', editable: true },
      { eam_field: 'name', erp_field: 'EQKTX', entity: 'Asset', editable: true },
      { eam_field: 'cost_center', erp_field: 'KOSTL', entity: 'Asset', editable: true },
      { eam_field: 'work_order_id', erp_field: 'AUFNR', entity: 'Work Order', editable: true },
      { eam_field: 'part_number', erp_field: 'MATNR', entity: 'Inventory', editable: true }
    ])
  }

  const handleSave = (eamField: string) => {
    showToast.success('Field mapping updated')
    setEditingField(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">ERP Field Mapping</h1>

      <ChartCard title="Asset Fields">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">EAM Field</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ERP Field</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mappings.filter(m => m.entity === 'Asset').map((mapping) => (
              <tr key={mapping.eam_field}>
                <td className="px-4 py-3 font-medium">{mapping.eam_field}</td>
                <td className="px-4 py-3">
                  {editingField === mapping.eam_field ? (
                    <input
                      type="text"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      className="border rounded px-2 py-1"
                      autoFocus
                    />
                  ) : (
                    <span className="font-mono text-sm">{mapping.erp_field}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingField === mapping.eam_field ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(mapping.eam_field)} className="text-green-600 hover:text-green-800">Save</button>
                      <button onClick={() => setEditingField(null)} className="text-gray-600 hover:text-gray-800">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingField(mapping.eam_field); setFieldValue(mapping.erp_field); }} className="text-blue-600 hover:text-blue-800">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>

      <ChartCard title="Work Order Fields">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">EAM Field</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ERP Field</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mappings.filter(m => m.entity === 'Work Order').map((mapping) => (
              <tr key={mapping.eam_field}>
                <td className="px-4 py-3 font-medium">{mapping.eam_field}</td>
                <td className="px-4 py-3">
                  {editingField === mapping.eam_field ? (
                    <input
                      type="text"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      className="border rounded px-2 py-1"
                      autoFocus
                    />
                  ) : (
                    <span className="font-mono text-sm">{mapping.erp_field}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingField === mapping.eam_field ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(mapping.eam_field)} className="text-green-600 hover:text-green-800">Save</button>
                      <button onClick={() => setEditingField(null)} className="text-gray-600 hover:text-gray-800">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingField(mapping.eam_field); setFieldValue(mapping.erp_field); }} className="text-blue-600 hover:text-blue-800">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>

      <ChartCard title="Inventory Fields">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">EAM Field</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ERP Field</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mappings.filter(m => m.entity === 'Inventory').map((mapping) => (
              <tr key={mapping.eam_field}>
                <td className="px-4 py-3 font-medium">{mapping.eam_field}</td>
                <td className="px-4 py-3">
                  {editingField === mapping.eam_field ? (
                    <input
                      type="text"
                      value={fieldValue}
                      onChange={(e) => setFieldValue(e.target.value)}
                      className="border rounded px-2 py-1"
                      autoFocus
                    />
                  ) : (
                    <span className="font-mono text-sm">{mapping.erp_field}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingField === mapping.eam_field ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(mapping.eam_field)} className="text-green-600 hover:text-green-800">Save</button>
                      <button onClick={() => setEditingField(null)} className="text-gray-600 hover:text-gray-800">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingField(mapping.eam_field); setFieldValue(mapping.erp_field); }} className="text-blue-600 hover:text-blue-800">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ChartCard>
    </div>
  )
}
