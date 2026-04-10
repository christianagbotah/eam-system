'use client';

import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import InteractiveTree from '@/components/hierarchy/InteractiveTree';
import NetworkGraph from '@/components/hierarchy/NetworkGraph';
import BOMViewer from '@/components/hierarchy/BOMViewer';
import SunburstChart from '@/components/hierarchy/SunburstChart';
import assetUnifiedService from '@/services/assetUnifiedService';
import { showToast } from '@/lib/toast';
import { CardSkeleton } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function HierarchyAdvancedPage() {
  const [treeData, setTreeData] = useState<any>(null);
  const [networkData, setNetworkData] = useState<any>({ nodes: [], edges: [] });
  const [bomData, setBomData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleExport = () => {
    showToast.success('Hierarchy data exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const tree = await assetUnifiedService.getTree();
      setTreeData(tree);
      
      if (tree) {
        const nodes = flattenTree(tree).map(node => ({
          id: node.id.toString(),
          data: { label: node.name },
          position: { x: Math.random() * 500, y: Math.random() * 500 },
        }));

        const edges = flattenTree(tree)
          .filter(node => node.parent_id)
          .map(node => ({
            id: `e${node.parent_id}-${node.id}`,
            source: node.parent_id.toString(),
            target: node.id.toString(),
          }));

        setNetworkData({ nodes, edges });
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const flattenTree = (node: any, parent_id?: number): any[] => {
    const result = [{ ...node, parent_id }];
    if (node.children) {
      node.children.forEach((child: any) => {
        result.push(...flattenTree(child, node.id));
      });
    }
    return result;
  };

  const loadBOM = async (assetId: number) => {
    try {
      const bom = await assetUnifiedService.getBOM(assetId, true);
      setBomData(bom);
    } catch (error) {
      console.error('BOM load error:', error);
    }
  };

  if (loading) return <CardSkeleton count={6} />;

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-6">Advanced Asset Visualization</h1>

      <Tab.Group>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-6">
          <Tab className={({ selected }) => `w-full rounded-lg py-2.5 text-sm font-medium ${selected ? 'bg-white text-blue-700 shadow' : 'text-gray-700'}`}>
            Tree View
          </Tab>
          <Tab className={({ selected }) => `w-full rounded-lg py-2.5 text-sm font-medium ${selected ? 'bg-white text-blue-700 shadow' : 'text-gray-700'}`}>
            Network Graph
          </Tab>
          <Tab className={({ selected }) => `w-full rounded-lg py-2.5 text-sm font-medium ${selected ? 'bg-white text-blue-700 shadow' : 'text-gray-700'}`}>
            BOM Viewer
          </Tab>
          <Tab className={({ selected }) => `w-full rounded-lg py-2.5 text-sm font-medium ${selected ? 'bg-white text-blue-700 shadow' : 'text-gray-700'}`}>
            Sunburst
          </Tab>
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel>
            {treeData ? <InteractiveTree data={treeData} onNodeClick={(n) => loadBOM(n.id)} /> : <div>No data</div>}
          </Tab.Panel>
          <Tab.Panel>
            <NetworkGraph nodes={networkData.nodes} edges={networkData.edges} />
          </Tab.Panel>
          <Tab.Panel>
            {bomData.length > 0 ? <BOMViewer items={bomData} /> : <div className="bg-white rounded-lg shadow p-8 text-center">Select an asset</div>}
          </Tab.Panel>
          <Tab.Panel>
            {treeData ? <SunburstChart data={treeData} /> : <div>No data</div>}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
