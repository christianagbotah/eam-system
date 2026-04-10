'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import MeterReadingForm from '@/components/assets/MeterReadingForm';
import CreateMeterForm from '@/components/assets/CreateMeterForm';
import Modal from '@/components/ui/Modal';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

interface Meter {
  id: number;
  asset_node_type: string;
  asset_node_id: number;
  meter_type: string;
  unit: string;
  value: number;
  last_read_at: string;
  version: number;
}

export default function MetersPage() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleExport = () => {
    const csv = [Object.keys(meters[0] || {}).join(','), ...meters.map(m => Object.values(m).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meters-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    showToast.success('Meters exported successfully')
  }

  useKeyboardShortcuts({
    onNew: () => setShowCreateForm(true),
    onExport: handleExport,
    onClose: () => setShowCreateForm(false)
  });

  useEffect(() => {
    fetchMeters();
  }, []);

  const fetchMeters = async () => {
    try {
      // Fetch meters for a sample asset - you can modify this
      const response = await api.get('/meters/list/equipment/1');
      if ((response.data as any)?.success) {
        setMeters((response.data as any)?.data || []);
      }
    } catch (error) {
      showToast.error('Failed to fetch meters');
    } finally {
      setLoading(false);
    }
  };

  const handleReadingSuccess = () => {
    setSelectedMeter(null);
    fetchMeters(); // Refresh the list
  };

  if (loading) return <div className="p-6"><CardSkeleton count={6} /></div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-semibold">Meters</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 text-white px-2 py-1 text-xs rounded-md hover:bg-green-700"
        >
          + Create Meter
        </button>
      </div>

      {/* Mobile: Full page form */}
      {showCreateForm && (
        <div className="mb-6 md:hidden">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Meter</h3>
            <CreateMeterForm
              onSuccess={() => {
                setShowCreateForm(false);
                fetchMeters();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop: Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Create New Meter"
        size="lg"
      >
        <CreateMeterForm
          onSuccess={() => {
            setShowCreateForm(false);
            fetchMeters();
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Meters</h2>
          <div className="space-y-4">
            {meters.length > 0 ? (
              meters.map(meter => (
                <div key={meter.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{meter.meter_type}</h3>
                      <p className="text-sm text-gray-600">
                        Asset: {meter.asset_node_type} #{meter.asset_node_id}
                      </p>
                      <p className="text-sm text-gray-600">
                        Current: {meter.value} {meter.unit}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last read: {formatDateTime(meter.last_read_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedMeter(meter)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Record Reading
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No meters found. Create meters for your assets first.
              </div>
            )}
          </div>
        </div>

        <div>
          {selectedMeter ? (
            <MeterReadingForm
              meterId={selectedMeter.id}
              meterName={selectedMeter.meter_type}
              currentValue={selectedMeter.value}
              unit={selectedMeter.unit}
              onSuccess={handleReadingSuccess}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
              Select a meter to record a reading
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
