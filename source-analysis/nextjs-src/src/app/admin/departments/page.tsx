'use client';

import { useState, useEffect } from 'react';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { departmentService } from '@/services/departmentService';
import { userService } from '@/services/userService';
import api from '@/lib/api';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import BulkActions, { useBulkSelection } from '@/components/BulkActions';
import RBACGuard from '@/components/RBACGuard';

function DepartmentsContent() {
  const [departments, setDepartments] = useState([]);
  const [mainDepartments, setMainDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('hierarchical');
  const [newDept, setNewDept] = useState({ 
    department_code: '', 
    department_name: '', 
    description: '', 
    facility_id: '', 
    supervisor_id: '', 
    parent_id: '',
    status: 'active', 
    staff_id_format: 'DEPT-{XXXX}' 
  });
  const [editDept, setEditDept] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { selectedIds, toggleSelect, selectAll, clearSelection, isSelected } = useBulkSelection(departments);

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 ? departments.filter((d: any) => selectedIds.includes(d.id)) : departments;
    const csv = [Object.keys(dataToExport[0] || {}).join(','), ...dataToExport.map((d: any) => Object.values(d).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `departments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    alert.success('Success', 'Departments exported successfully');
  };

  useKeyboardShortcuts({
    onNew: () => setShowModal(true),
    onExport: handleExport,
    onClose: () => setShowModal(false)
  });

  useEffect(() => { 
    fetchData();
    loadDropdownData();
  }, [viewMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await departmentService.getDepartments(viewMode === 'hierarchical');
      const depts = res.data || [];
      setDepartments(depts);
      
      const mainRes = await departmentService.getMainDepartments();
      setMainDepartments(mainRes.data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
      setMainDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const [usersRes, facilitiesRes] = await Promise.all([
        api.get('/users'),
        api.get('/facilities')
      ]);
      setUsers(usersRes.data?.data || []);
      setFacilities(facilitiesRes.data?.data || []);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      setUsers([]);
      setFacilities([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newDept,
        facility_id: newDept.facility_id || null,
        supervisor_id: newDept.supervisor_id || null,
        parent_id: newDept.parent_id || null
      };
      await departmentService.createDepartment(payload);
      alert.success('Success', 'Department created successfully!');
      setShowModal(false);
      setNewDept({ 
        department_code: '', 
        department_name: '', 
        description: '', 
        facility_id: '', 
        supervisor_id: '', 
        parent_id: '',
        status: 'active', 
        staff_id_format: 'DEPT-{XXXX}' 
      });
      fetchData();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create department';
      alert.error('Error', errorMsg);
    }
  };

  const handleEdit = (dept: any) => {
    setEditDept(dept);
    setShowEditModal(true);
  };

  const handleDeleteClick = (id: number) => {
    alert.confirm(
      'Delete Department',
      'Are you sure you want to delete this department? This action cannot be undone.',
      async () => {
        try {
          await departmentService.deleteDepartment(id);
          alert.success('Success', 'Department deleted successfully!');
          fetchData();
        } catch (error: any) {
          alert.error('Error', 'Failed to delete department');
        }
      }
    );
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...editDept,
        facility_id: editDept.facility_id || null,
        supervisor_id: editDept.supervisor_id || null,
        parent_id: editDept.parent_id || null
      };
      await departmentService.updateDepartment(editDept.id, payload);
      alert.success('Success', 'Department updated successfully!');
      setShowEditModal(false);
      setEditDept(null);
      fetchData();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to update department');
    }
  };

  const handleBulkDelete = async () => {
    alert.confirm(
      'Delete Departments',
      `Are you sure you want to delete ${selectedIds.length} department(s)? This action cannot be undone.`,
      async () => {
        try {
          await Promise.all(selectedIds.map(id => departmentService.deleteDepartment(id)));
          alert.success('Success', `${selectedIds.length} departments deleted successfully`);
          clearSelection();
          fetchData();
        } catch (error) {
          alert.error('Error', 'Failed to delete departments');
        }
      }
    );
  };

  const renderDepartmentCard = (dept: any, isSubDept = false) => (
    <div key={dept.id} className={`p-6 hover:bg-gray-50 transition-colors group ${isSubDept ? 'ml-12 border-l-4 border-blue-200' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input 
            type="checkbox" 
            checked={isSelected(dept.id)} 
            onChange={() => toggleSelect(dept.id)} 
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div className={`w-12 h-12 bg-gradient-to-br ${isSubDept ? 'from-blue-400 to-blue-500' : 'from-blue-500 to-blue-600'} rounded-lg flex items-center justify-center text-white font-bold text-xs`}>
            {dept.department_code || 'N/A'}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              {isSubDept && <span className="text-blue-500">ΓööΓöÇ</span>}
              <h4 className="text-lg font-semibold text-gray-900">{dept.department_name}</h4>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {dept.department_code}
              </span>
              {dept.level && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {dept.level === 1 ? 'Main' : 'Sub'}
                </span>
              )}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                dept.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {dept.status}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">{dept.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Supervisor: {dept.supervisor_name || 'Unassigned'}</span>
              </div>
              {dept.parent_name && (
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>Parent: {dept.parent_name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => handleEdit(dept)}
            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button 
            onClick={() => handleDeleteClick(dept.id)}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-base font-semibold">Departments</h1>
            <p className="text-xs text-gray-600 text-sm mt-0.5">Manage organizational departments and sub-departments</p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('hierarchical')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'hierarchical' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ≡ƒÅó Hierarchical
              </button>
              <button 
                onClick={() => setViewMode('flat')}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  viewMode === 'flat' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                ≡ƒôï Flat List
              </button>
            </div>
            <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">≡ƒôÑ Export</button>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">+ Add Department</button>
          </div>
        </div>

        <BulkActions
          selectedIds={selectedIds}
          totalCount={departments.length}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleExport}
        />

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="divide-y divide-gray-100">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                      <div>
                        <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                      </div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : departments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Departments Yet</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">Create your first department to start organizing your facility operations</p>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors">
              + Create First Department
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {viewMode === 'hierarchical' ? 'Department Hierarchy' : 'All Departments'}
                </h3>
                <span className="text-sm text-gray-500">{departments.length} departments</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {viewMode === 'hierarchical' ? (
                departments.map((dept: any) => (
                  <div key={dept.id}>
                    {renderDepartmentCard(dept, false)}
                    {dept.sub_departments && dept.sub_departments.length > 0 && (
                      <div className="bg-blue-50/30">
                        {dept.sub_departments.map((sub: any) => renderDepartmentCard(sub, true))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                departments.map((dept: any) => renderDepartmentCard(dept, dept.level === 2))
              )}
            </div>
          </div>
        )}
        <FormModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Add Department"
          size="lg"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <svg className="w-4 h-4 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Department Type</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Leave "Parent Department" empty to create a main department, or select a parent to create a sub-department.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Department Code *</label>
                <input 
                  type="text" 
                  value={newDept.department_code} 
                  onChange={(e) => setNewDept({...newDept, department_code: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                  placeholder="e.g., ENG, ENG-ELEC"
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Department Name *</label>
                <input 
                  type="text" 
                  value={newDept.department_name} 
                  onChange={(e) => setNewDept({...newDept, department_name: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                  placeholder="e.g., Engineering, Electrical"
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Parent Department (Optional)</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'None - Create as Main Department' },
                  ...mainDepartments.map((dept: any) => ({
                    value: dept.id.toString(),
                    label: `${dept.department_name} (${dept.department_code})`
                  }))
                ]}
                value={newDept.parent_id}
                onChange={(value) => setNewDept({...newDept, parent_id: value})}
                placeholder="Select parent department..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Select a parent to create this as a sub-department
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <textarea 
                value={newDept.description} 
                onChange={(e) => setNewDept({...newDept, description: e.target.value})} 
                className="w-full border rounded px-3 py-2" 
                rows={3}
                placeholder="Brief description of the department's responsibilities"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Staff ID Format</label>
              <input 
                type="text" 
                value={newDept.staff_id_format} 
                onChange={(e) => setNewDept({...newDept, staff_id_format: e.target.value})} 
                className="w-full border rounded px-3 py-2" 
                placeholder="e.g., DEPT-{XXXX}, HR-{XXXX}"
              />
              <p className="text-xs text-gray-500 mt-1">Use {'{XXXX}'} as placeholder for auto-increment number</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Facility (Optional)</label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'None' },
                    ...facilities.map((facility: any) => ({
                      value: facility.id.toString(),
                      label: `${facility.facility_name} (${facility.facility_code})`
                    }))
                  ]}
                  value={newDept.facility_id}
                  onChange={(value) => setNewDept({...newDept, facility_id: value})}
                  placeholder="Select facility..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Supervisor (Optional)</label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'None' },
                    ...users.filter((u: any) => u.role === 'supervisor').map((user: any) => ({
                      value: user.id.toString(),
                      label: user.username
                    }))
                  ]}
                  value={newDept.supervisor_id}
                  onChange={(value) => setNewDept({...newDept, supervisor_id: value})}
                  placeholder="Select supervisor..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select 
                  value={newDept.status} 
                  onChange={(e) => setNewDept({...newDept, status: e.target.value})} 
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="px-6 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="px-6 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </form>
        </FormModal>

        <FormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Department"
          size="lg"
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            {editDept?.level === 2 && editDept?.parent_name && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-sm text-blue-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>Sub-Department of: <strong>{editDept.parent_name}</strong></span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Department Code *</label>
                <input 
                  type="text" 
                  value={editDept?.department_code || ''} 
                  onChange={(e) => setEditDept({...editDept, department_code: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Department Name *</label>
                <input 
                  type="text" 
                  value={editDept?.department_name || ''} 
                  onChange={(e) => setEditDept({...editDept, department_name: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Parent Department (Optional)</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'None - Main Department' },
                  ...mainDepartments.filter((d: any) => d.id !== editDept?.id).map((dept: any) => ({
                    value: dept.id.toString(),
                    label: `${dept.department_name} (${dept.department_code})`
                  }))
                ]}
                value={editDept?.parent_id?.toString() || ''}
                onChange={(value) => setEditDept({...editDept, parent_id: value})}
                placeholder="Select parent department..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <textarea 
                value={editDept?.description || ''} 
                onChange={(e) => setEditDept({...editDept, description: e.target.value})} 
                className="w-full border rounded px-3 py-2" 
                rows={3} 
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Staff ID Format</label>
              <input 
                type="text" 
                value={editDept?.staff_id_format || 'DEPT-{XXXX}'} 
                onChange={(e) => setEditDept({...editDept, staff_id_format: e.target.value})} 
                className="w-full border rounded px-3 py-2" 
                placeholder="e.g., DEPT-{XXXX}, HR-{XXXX}"
              />
              <p className="text-xs text-gray-500 mt-1">Use {'{XXXX}'} as placeholder for auto-increment number</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Facility (Optional)</label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'None' },
                    ...facilities.map((facility: any) => ({
                      value: facility.id.toString(),
                      label: `${facility.facility_name} (${facility.facility_code})`
                    }))
                  ]}
                  value={editDept?.facility_id?.toString() || ''}
                  onChange={(value) => setEditDept({...editDept, facility_id: value})}
                  placeholder="Select facility..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Supervisor (Optional)</label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'None' },
                    ...users.filter((u: any) => u.role === 'supervisor').map((user: any) => ({
                      value: user.id.toString(),
                      label: user.username
                    }))
                  ]}
                  value={editDept?.supervisor_id?.toString() || ''}
                  onChange={(value) => setEditDept({...editDept, supervisor_id: value})}
                  placeholder="Select supervisor..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Status</label>
                <select 
                  value={editDept?.status || 'active'} 
                  onChange={(e) => setEditDept({...editDept, status: e.target.value})} 
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)} 
                className="px-6 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-6 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                Update Department
              </button>
            </div>
          </form>
        </FormModal>
      </div>
    </>
  );
}

export default function DepartmentsPage() {
  return (
    <RBACGuard module="departments" action="view">
      <DepartmentsContent />
    </RBACGuard>
  );
}
