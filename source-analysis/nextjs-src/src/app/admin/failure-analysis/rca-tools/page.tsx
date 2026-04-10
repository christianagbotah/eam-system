'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Trash2, List, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import RBACGuard from '@/components/RBACGuard';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';

function RCAToolsContent() {
  const [tool, setTool] = useState<'5whys' | 'fishbone'>('5whys');
  const [whys, setWhys] = useState({ problem: '', why1: '', why2: '', why3: '', why4: '', why5: '', assetId: 1 });
  const [fishbone, setFishbone] = useState({
    problem: '', assetId: 1,
    people: [''], process: [''], equipment: [''], materials: [''], environment: [''], management: ['']
  });
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [showList, setShowList] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showList) {
      fetchSavedAnalyses();
    }
  }, [showList, tool]);

  const fetchSavedAnalyses = async () => {
    try {
      const endpoint = tool === '5whys' ? '/rca/5whys' : '/rca/fishbone';
      const res = await api.get(endpoint);
      if (res.data?.status === 'success') {
        setSavedAnalyses(res.data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const save5Whys = async () => {
    if (!whys.problem) {
      showToast.error('Please enter a problem statement');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/rca/5whys', whys);
      if (res.data?.status === 'success') {
        showToast.success('5 Whys analysis saved successfully');
        setWhys({ problem: '', why1: '', why2: '', why3: '', why4: '', why5: '', assetId: 1 });
      }
    } catch (error) {
      showToast.error('Failed to save analysis');
    } finally {
      setSaving(false);
    }
  };

  const saveFishbone = async () => {
    if (!fishbone.problem) {
      showToast.error('Please enter a problem statement');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/rca/fishbone', fishbone);
      if (res.data?.status === 'success') {
        showToast.success('Fishbone diagram saved successfully');
        setFishbone({
          problem: '', assetId: 1,
          people: [''], process: [''], equipment: [''], materials: [''], environment: [''], management: ['']
        });
      }
    } catch (error) {
      showToast.error('Failed to save diagram');
    } finally {
      setSaving(false);
    }
  };

  const loadAnalysis = (item: any) => {
    if (tool === '5whys') {
      setWhys({
        problem: item.problem_statement,
        why1: item.why1 || '',
        why2: item.why2 || '',
        why3: item.why3 || '',
        why4: item.why4 || '',
        why5: item.why5 || '',
        assetId: item.asset_id
      });
    } else {
      setFishbone({
        problem: item.problem_statement,
        assetId: item.asset_id,
        people: item.people || [''],
        process: item.process || [''],
        equipment: item.equipment || [''],
        materials: item.materials || [''],
        environment: item.environment || [''],
        management: item.management || ['']
      });
    }
    setShowList(false);
    showToast.success('Analysis loaded');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link href="/admin/failure-analysis" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base font-semibold">RCA Analysis Tools</h1>
              <p className="text-gray-600">Root cause investigation methodologies</p>
            </div>
          </div>
          <button onClick={() => setShowList(!showList)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md flex items-center gap-2">
            <List className="w-4 h-4" />
            {showList ? 'Hide' : 'Show'} Saved
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <button onClick={() => setTool('5whys')} className={`px-6 py-2 rounded-lg font-medium ${tool === '5whys' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>5 Whys</button>
            <button onClick={() => setTool('fishbone')} className={`px-6 py-2 rounded-lg font-medium ${tool === 'fishbone' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Fishbone</button>
          </div>
        </div>

        {showList && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Saved {tool === '5whys' ? '5 Whys' : 'Fishbone'} Analyses</h2>
              <button onClick={fetchSavedAnalyses} className="p-2 hover:bg-gray-100 rounded-lg">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {savedAnalyses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No saved analyses found</div>
            ) : (
              <div className="space-y-2">
                {savedAnalyses.map((item: any) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => loadAnalysis(item)}>
                    <div className="font-medium">{item.problem_statement}</div>
                    <div className="text-sm text-xs text-gray-600 mt-0.5">
                      {item.asset_name || `Asset #${item.asset_id}`} • {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tool === '5whys' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-6">5 Whys Analysis</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Problem Statement</label>
                <input type="text" value={whys.problem} onChange={(e) => setWhys({...whys, problem: e.target.value})} placeholder="What is the problem?" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              {['why1', 'why2', 'why3', 'why4', 'why5'].map((key, i) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-2">Why #{i + 1}</label>
                  <input type="text" value={whys[key as keyof typeof whys] as string} onChange={(e) => setWhys({...whys, [key]: e.target.value})} placeholder={`Why did this ${i > 0 ? 'happen' : 'occur'}?`} className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <button onClick={save5Whys} disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Analysis'}
              </button>
            </div>
          </div>
        )}

        {tool === 'fishbone' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-6">Fishbone Diagram (Ishikawa)</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Problem Statement</label>
              <input type="text" value={fishbone.problem} onChange={(e) => setFishbone({...fishbone, problem: e.target.value})} placeholder="What is the problem?" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {(['people', 'process', 'equipment', 'materials', 'environment', 'management'] as const).map(cat => (
                <div key={cat} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold capitalize">{cat}</h3>
                    <button onClick={() => setFishbone({...fishbone, [cat]: [...fishbone[cat], '']})} className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-full"><Plus className="w-4 h-4" /></button>
                  </div>
                  {fishbone[cat].map((c, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input type="text" value={c} onChange={(e) => { const n = [...fishbone[cat]]; n[i] = e.target.value; setFishbone({...fishbone, [cat]: n}); }} placeholder="Add cause..." className="flex-1 px-2.5 py-1.5 text-sm text-sm border rounded focus:ring-2 focus:ring-blue-500" />
                      {i > 0 && <button onClick={() => { const n = fishbone[cat].filter((_, idx) => idx !== i); setFishbone({...fishbone, [cat]: n}); }} className="p-2 hover:bg-red-50 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={saveFishbone} disabled={saving} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Diagram'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RCAToolsPage() {
  return (
    <RBACGuard module="rca_analysis" action="view">
      <RCAToolsContent />
    </RBACGuard>
  );
}
