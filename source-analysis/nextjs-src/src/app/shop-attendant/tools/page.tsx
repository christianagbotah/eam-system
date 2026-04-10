'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Scan, LogOut, LogIn, Search, AlertTriangle, CheckCircle, Clock, User, Trash2 } from 'lucide-react';

export default function ShopAttendantToolsPage() {
  const [activeTab, setActiveTab] = useState<'checkout' | 'return' | 'active'>('checkout');
  const [tools, setTools] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [returnCondition, setReturnCondition] = useState('good');
  const [returnNotes, setReturnNotes] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadActiveAssignments, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [toolsRes, techRes, woRes] = await Promise.all([
        api.get('/tools'),
        api.get('/users'),
        api.get('/work-orders?status=assigned,in_progress')
      ]);
      setTools(toolsRes.data?.data || []);
      setTechnicians(techRes.data?.data?.filter((u: any) => u.role === 'technician') || []);
      setWorkOrders(woRes.data?.data || []);
      loadActiveAssignments();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadActiveAssignments = async () => {
    try {
      const response = await api.get('/tool-assignments?status=assigned,in_use');
      setActiveAssignments(response.data?.data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleBarcodeSearch = (barcode: string) => {
    const tool = tools.find(t => t.barcode === barcode || t.tool_code === barcode);
    if (tool) {
      setSelectedTool(tool);
      setSearchTerm('');
    } else {
      alert.error('Not Found', 'Tool not found with this barcode');
    }
  };

  const handleCheckout = async () => {
    if (!selectedTool || !selectedTechnician || !selectedWorkOrder) {
      alert.error('Error', 'Please select tool, technician, and work order');
      return;
    }

    if (selectedTool.quantity_available < quantity) {
      alert.error('Error', 'Insufficient quantity available');
      return;
    }

    try {
      await api.post('/tools/assign', {
        tool_id: selectedTool.id,
        work_order_id: selectedWorkOrder,
        assigned_to_user_id: selectedTechnician,
        quantity: quantity
      });
      alert.success('Success', `${selectedTool.tool_name} checked out successfully`);
      resetCheckoutForm();
      loadData();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to checkout tool');
    }
  };

  const handleReturn = async (assignment: any) => {
    try {
      await api.post('/tools/return', {
        assignment_id: assignment.id,
        condition: returnCondition,
        notes: returnNotes
      });
      alert.success('Success', 'Tool returned successfully');
      setReturnCondition('good');
      setReturnNotes('');
      loadData();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to return tool');
    }
  };

  const handleDeleteAssignment = (id: number) => {
    alert.confirm(
      'Cancel Assignment',
      'Are you sure you want to cancel this tool assignment?',
      async () => {
        try {
          await api.delete(`/tool-assignments/${id}`);
          alert.success('Success', 'Assignment cancelled successfully');
          loadData();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to cancel assignment');
        }
      }
    );
  };

  const resetCheckoutForm = () => {
    setSelectedTool(null);
    setSelectedTechnician('');
    setSelectedWorkOrder('');
    setQuantity(1);
    setSearchTerm('');
    barcodeInputRef.current?.focus();
  };

  const filteredTools = tools.filter(t => 
    t.tool_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tool_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <h1 className="text-4xl font-bold mb-2">Tool Checkout Station</h1>
        <p className="text-emerald-100">Quick tool checkout and return management</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('checkout')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2 ${
            activeTab === 'checkout' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <LogOut className="w-4 h-4" />
          Checkout
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2 ${
            activeTab === 'return' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <LogIn className="w-4 h-4" />
          Return
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all inline-flex items-center justify-center gap-2 ${
            activeTab === 'active' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Active ({activeAssignments.length})
        </button>
      </div>

      {/* Checkout Tab */}
      {activeTab === 'checkout' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left: Tool Selection */}
          <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Select Tool</h2>
            
            {/* Barcode Scanner */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <label className="block text-sm font-semibold text-blue-900 mb-2 inline-flex items-center gap-2">
                <Scan className="w-4 h-4" />
                Scan Barcode or Search
              </label>
              <div className="flex gap-2">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && searchTerm) {
                      handleBarcodeSearch(searchTerm);
                    }
                  }}
                  className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                  placeholder="Scan or type tool code..."
                  autoFocus
                />
                <button
                  onClick={() => searchTerm && handleBarcodeSearch(searchTerm)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Selected Tool Display */}
            {selectedTool ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  {selectedTool.image_url ? (
                    <img src={selectedTool.image_url} alt={selectedTool.tool_name} className="w-24 h-24 object-cover rounded-lg" />
                  ) : (
                    <div className="w-24 h-24 bg-emerald-200 rounded-lg flex items-center justify-center">
                      <Scan className="w-12 h-12 text-emerald-700" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{selectedTool.tool_name}</h3>
                    <p className="text-sm text-gray-600 font-mono">{selectedTool.tool_code}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="px-3 py-1 bg-emerald-200 text-emerald-800 rounded-full text-sm font-semibold">
                        Available: {selectedTool.quantity_available}
                      </span>
                      {selectedTool.category && (
                        <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                          {selectedTool.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTool(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredTools.filter(t => t.quantity_available > 0).map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => setSelectedTool(tool)}
                    className="w-full p-4 bg-gray-50 hover:bg-emerald-50 border-2 border-gray-200 hover:border-emerald-300 rounded-lg transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      {tool.image_url ? (
                        <img src={tool.image_url} alt={tool.tool_name} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <Scan className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{tool.tool_name}</p>
                        <p className="text-sm text-gray-500">{tool.tool_code}</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
                        {tool.quantity_available}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Assignment Details */}
          <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Assignment Details</h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Technician *</label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-lg"
                disabled={!selectedTool}
              >
                <option value="">Select Technician...</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name || tech.username} - {tech.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Work Order *</label>
              <select
                value={selectedWorkOrder}
                onChange={(e) => setSelectedWorkOrder(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-lg"
                disabled={!selectedTool}
              >
                <option value="">Select Work Order...</option>
                {workOrders.map(wo => (
                  <option key={wo.id} value={wo.id}>
                    {wo.work_order_number} - {wo.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                min="1"
                max={selectedTool?.quantity_available || 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-lg"
                disabled={!selectedTool}
              />
            </div>

            <div className="pt-4 border-t space-y-3">
              <button
                onClick={handleCheckout}
                disabled={!selectedTool || !selectedTechnician || !selectedWorkOrder}
                className="w-full px-6 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-6 h-6" />
                Checkout Tool
              </button>
              <button
                onClick={resetCheckoutForm}
                className="w-full px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Tab */}
      {activeTab === 'return' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {activeAssignments.filter(a => a.status === 'assigned' || a.status === 'in_use').map(assignment => (
            <div key={assignment.id} id={`assignment-${assignment.id}`} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Scan className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{assignment.tool_name}</h3>
                  <p className="text-sm text-gray-500">{assignment.tool_code}</p>
                  <p className="text-sm text-xs text-gray-600 mt-0.5">
                    <User className="w-3 h-3 inline mr-1" />
                    {assignment.assigned_to_name}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Condition on Return</label>
                  <select
                    value={returnCondition}
                    onChange={(e) => setReturnCondition(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                    rows={2}
                    placeholder="Any issues or observations..."
                  />
                </div>

                <button
                  onClick={() => handleReturn(assignment)}
                  className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-semibold inline-flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Return Tool
                </button>
              </div>
            </div>
          ))}
          {activeAssignments.filter(a => a.status === 'assigned' || a.status === 'in_use').length === 0 && (
            <div className="col-span-full text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tools to Return</h3>
              <p className="text-gray-500">All tools are currently available</p>
            </div>
          )}
        </div>
      )}

      {/* Active Assignments Tab */}
      {activeTab === 'active' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Tool</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Technician</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Work Order</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Checked Out</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeAssignments.map(assignment => (
                  <tr key={assignment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{assignment.tool_name}</div>
                      <div className="text-sm text-gray-500">{assignment.tool_code}</div>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-900">{assignment.assigned_to_name}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-900">{assignment.work_order_number}</td>
                    <td className="px-3 py-2.5 text-sm font-semibold">{assignment.quantity}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-600">{new Date(assignment.assigned_at).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        assignment.status === 'in_use' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {assignment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setActiveTab('return');
                            setTimeout(() => {
                              const element = document.getElementById(`assignment-${assignment.id}`);
                              element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 100);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium"
                        >
                          <LogIn className="w-4 h-4" />
                          Return
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {tools.filter(t => t.quantity_available > 0 && t.quantity_available <= 2).length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-900 mb-1">Low Stock Alert</h3>
              <p className="text-sm text-amber-800">
                {tools.filter(t => t.quantity_available > 0 && t.quantity_available <= 2).length} tool(s) running low on stock
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
