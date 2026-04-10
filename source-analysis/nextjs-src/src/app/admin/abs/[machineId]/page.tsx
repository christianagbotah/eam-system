'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AssetTree from '@/components/abs/AssetTree';
import NodeDetailPanel from '@/components/abs/NodeDetailPanel';
import NodeFormModal from '@/components/abs/NodeFormModal';
import Breadcrumb from '@/components/ui/Breadcrumb';
import api from '@/lib/api';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function AssetBreakdownPage() {
  const params = useParams();
  const machineId = parseInt(params.machineId as string);
  
  const [tree, setTree] = useState([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: any } | null>(null);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [parentNode, setParentNode] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleExport = () => {
    const csv = [['Node ID', 'Node Name', 'Type', 'Parent'].join(','), ...tree.map((n: any) => [n.id, n.node_name, n.node_type, n.parent_id].join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abs-${machineId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast.success('Exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => { setParentNode(null); setEditingNode(null); setShowNodeForm(true); },
    onExport: handleExport,
    onClose: () => setShowNodeForm(false)
  });

  useEffect(() => {
    loadTree();
  }, [machineId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const loadTree = async () => {
    try {
      const { data } = await api.get(`/asset-tree/${machineId}`);
      setTree(data.data || []);
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNodeDetails = async (nodeId: number) => {
    try {
      const { data } = await api.get(`/asset-node/${nodeId}`);
      setSelectedNode(data.data);
    } catch (error) {
      console.error('Node details load error:', error);
    }
  };

  const handleNodeClick = (node: any) => {
    loadNodeDetails(node.id);
  };

  const handleNodeContextMenu = (node: any, e: React.MouseEvent) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const handleAddNode = () => {
    setParentNode(contextMenu?.node || null);
    setEditingNode(null);
    setShowNodeForm(true);
    setContextMenu(null);
  };

  const handleEditNode = () => {
    setEditingNode(contextMenu?.node);
    setShowNodeForm(true);
    setContextMenu(null);
  };

  const handleDeleteNode = async () => {
    if (!contextMenu?.node) return;
    
    if (confirm(`Delete ${contextMenu.node.node_name}?`)) {
      try {
        await api.delete(`/asset-node/${contextMenu.node.id}`);
        showToast.success('Node deleted successfully');
        loadTree();
        setSelectedNode(null);
      } catch (error: any) {
        showToast.error(error.response?.data?.message || 'Failed to delete node');
      }
    }
    setContextMenu(null);
  };

  const handleSubmitNode = async (formData: FormData) => {
    try {
      if (editingNode) {
        await api.put(`/asset-node/${editingNode.id}`, formData);
        showToast.success('Node updated successfully');
      } else {
        await api.post('/asset-node', formData);
        showToast.success('Node created successfully');
      }
      loadTree();
      if (selectedNode) {
        loadNodeDetails(selectedNode.id);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to save node');
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Machines', href: '/machine/machineLists' },
          { label: 'Asset Breakdown Structure' },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Breakdown Structure</h1>
          <p className="text-gray-600 mt-1">Machine ID: {machineId}</p>
        </div>
        <button
          onClick={() => {
            setParentNode(null);
            setEditingNode(null);
            setShowNodeForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          + Add Root Node
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading asset tree...</p>
            </div>
          ) : (
            <AssetTree
              nodes={tree}
              onNodeClick={handleNodeClick}
              onNodeContextMenu={handleNodeContextMenu}
              selectedNodeId={selectedNode?.id}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          {selectedNode ? (
            <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">Select a node to view details</p>
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleAddNode}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Child Node
          </button>
          <button
            onClick={handleEditNode}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Node
          </button>
          <button
            onClick={handleDeleteNode}
            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Node
          </button>
        </div>
      )}

      <NodeFormModal
        isOpen={showNodeForm}
        onClose={() => setShowNodeForm(false)}
        onSubmit={handleSubmitNode}
        machineId={machineId}
        parentNode={parentNode}
        editNode={editingNode}
      />
    </div>
  );
}
