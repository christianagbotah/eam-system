'use client'
import React, { useEffect, useState } from 'react';
import { listMeters, addReading, createMeter, getMeterReadings } from '@/lib/meterService';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';

export default function MeterWidget({ nodeType, nodeId }: { nodeType: string, nodeId: number }) {
  const [meters, setMeters] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newValue, setNewValue] = useState<Record<number, string>>({});

  useEffect(() => { fetchMeters(); }, [nodeType, nodeId]);

  async function fetchMeters() {
    setLoading(true);
    try {
      const res = await listMeters(nodeType, nodeId);
      setMeters(res.data.data || []);
      if (res.data.data && res.data.data[0]) setSelected(res.data.data[0].id);
    } finally { setLoading(false); }
  }

  async function loadHistory(meterId:number) {
    try {
      const res = await getMeterReadings(meterId, 200);
      const rows = (res.data.data || []).map((r:any) => ({
        reading_at: r.reading_at,
        value: parseFloat(r.value)
      })).reverse(); // oldest first
      setHistory(rows);
    } catch (e) { setHistory([]); }
  }

  useEffect(() => { if (selected) loadHistory(selected); else setHistory([]); }, [selected]);

  async function submitReading(meterId:number) {
    const raw = newValue[meterId];
    const val = parseFloat(raw);
    if (isNaN(val)) return alert('Enter numeric value');
    try {
      await addReading(meterId, val);
      setNewValue(prev => ({ ...prev, [meterId]: '' }));
      await fetchMeters();
      await loadHistory(meterId);
    } catch (e:any) {
      alert(e?.response?.data?.message || e?.message || 'Failed to add reading');
    }
  }

  return (
    <div className="bg-white shadow rounded p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">Meters</h3>
      </div>

      {!loading && meters.length === 0 && <div>No meters defined.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          {meters.map(m => (
            <div key={m.id} className={`p-3 border rounded mb-2 ${selected === m.id ? 'ring-1 ring-blue-500' : ''}`}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{m.meter_type}</div>
                  <div className="text-sm text-gray-600">{m.value} {m.unit} • {m.last_read_at ?? 'n/a'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>setSelected(m.id)} className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">View</button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <input type="number" step="any" value={newValue[m.id] ?? ''} onChange={(e)=>setNewValue(prev=>({ ...prev, [m.id]: e.target.value }))} className="px-2 py-1 border rounded w-32 text-sm" placeholder="new" />
                <button onClick={()=>submitReading(m.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save</button>
              </div>
            </div>
          ))}
        </div>

        <div>
          {selected ? (
            <div>
              <div className="mb-2 font-medium">History</div>
              {history.length === 0 && <div className="text-sm text-gray-600">No historical readings.</div>}
              {history.length > 0 && (
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="reading_at" tickFormatter={(val)=>val.replace('T',' ')} minTickGap={20} />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#4f46e5" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : <div className="text-sm text-gray-600">Select a meter to view history.</div>}
        </div>
      </div>
    </div>
  );
}
