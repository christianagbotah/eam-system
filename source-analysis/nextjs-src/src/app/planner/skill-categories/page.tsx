'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import { Edit, Trash2 } from 'lucide-react';

interface Category {
  id: number;
  category_name: string;
  description: string;
  is_active: number;
}

export default function SkillCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('active');
  const [formData, setFormData] = useState({ category_name: '', description: '', is_active: 1 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      setFilteredCategories(categories);
    } else if (activeTab === 'active') {
      setFilteredCategories(categories.filter(c => c.is_active == 1 || c.is_active === true));
    } else {
      setFilteredCategories(categories.filter(c => c.is_active == 0 || c.is_active === false));
    }
  }, [categories, activeTab]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/skill-categories');
      if (res.data?.status === 'success') setCategories(res.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/skill-categories/${editingId}`, formData);
        alert.success('Success', 'Category updated successfully');
      } else {
        await api.post('/skill-categories', formData);
        alert.success('Success', 'Category created successfully');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ category_name: '', description: '', is_active: 1 });
      fetchCategories();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setFormData({ category_name: cat.category_name, description: cat.description, is_active: cat.is_active });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    alert.confirm(
      'Delete Category',
      'Are you sure you want to delete this category?',
      async () => {
        try {
          await api.delete(`/skill-categories/${id}`);
          alert.success('Success', 'Category deleted successfully');
          fetchCategories();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to delete category');
        }
      }
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-blue-600 rounded-lg shadow-sm p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Skill Categories</h1>
            <p className="text-blue-100">Manage skill categories and classifications</p>
          </div>
          <button onClick={() => { setEditingId(null); setFormData({ category_name: '', description: '', is_active: 1 }); setShowModal(true); }} className="bg-white text-blue-600 px-3 py-1.5 text-sm rounded-lg hover:bg-blue-50 transition-all font-semibold shadow-lg inline-flex items-center gap-2">
            + Create Category
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button onClick={() => setActiveTab('active')} className={`px-6 py-3 font-medium ${activeTab === 'active' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}>
              Active ({categories.filter(c => c.is_active == 1 || c.is_active === true).length})
            </button>
            <button onClick={() => setActiveTab('inactive')} className={`px-6 py-3 font-medium ${activeTab === 'inactive' ? 'border-b-2 border-gray-600 text-gray-600' : 'text-gray-600'}`}>
              Inactive ({categories.filter(c => c.is_active == 0 || c.is_active === false).length})
            </button>
            <button onClick={() => setActiveTab('all')} className={`px-6 py-3 font-medium ${activeTab === 'all' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-600'}`}>
              All ({categories.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No categories found</div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">{cat.category_name}</td>
                    <td className="px-3 py-2.5 text-sm text-gray-500">{cat.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${cat.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(cat)} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium">
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button onClick={() => handleDelete(cat.id)} className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Category' : 'Create Category'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category Name</label>
                <input type="text" required value={formData.category_name} onChange={(e) => setFormData({ ...formData, category_name: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border rounded" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-2.5 py-1.5 text-sm border rounded" rows={3} />
              </div>
              <div className="flex items-center">
                <input type="checkbox" checked={formData.is_active === 1} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })} className="w-4 h-4 text-blue-600 rounded" />
                <label className="ml-2 text-sm text-gray-700">Active</label>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} className="px-4 py-2 border rounded hover:bg-gray-50" disabled={submitting}>Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={submitting}>{submitting ? 'Saving...' : (editingId ? 'Update' : 'Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
