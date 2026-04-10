'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';
import FormModal from '@/components/ui/FormModal';
import SearchableSelect from '@/components/SearchableSelect';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

export default function SupervisorSkillsPage() {
  const [skills, setSkills] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive' | 'all'>('active');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [formData, setFormData] = useState({
    skill_name: '',
    skill_code: '',
    description: '',
    category_id: '',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  useEffect(() => {
    loadSkills();
    loadCategories();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = skills.filter(skill =>
        skill.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skill.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      applyTabFilter(filtered);
    } else {
      applyTabFilter(skills);
    }
  }, [skills, searchTerm, activeTab]);

  const applyTabFilter = (data: any[]) => {
    if (activeTab === 'all') {
      setFilteredSkills(data);
    } else if (activeTab === 'active') {
      setFilteredSkills(data.filter(s => s.is_active));
    } else {
      setFilteredSkills(data.filter(s => !s.is_active));
    }
  };

  const loadSkills = async () => {
    try {
      const response = await api.get('/skills');
      setSkills(response.data?.data || []);
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/skill-categories');
      setCategories(response.data?.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleEdit = (skill: any) => {
    setEditingSkill(skill);
    // Find category_id by matching category name
    const category = categories.find(cat => cat.category_name === skill.category);
    setFormData({
      skill_name: skill.name || '',
      skill_code: skill.skill_code || '',
      description: skill.description || '',
      category_id: category ? category.id.toString() : '',
      is_active: skill.is_active !== false
    });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    alert.confirm(
      'Delete Skill',
      'Are you sure you want to delete this skill?',
      async () => {
        try {
          await api.delete(`/skills/${id}`);
          alert.success('Success', 'Skill deleted successfully');
          loadSkills();
        } catch (error: any) {
          alert.error('Error', error.response?.data?.message || 'Failed to delete skill');
        }
      }
    );
  };

  const resetForm = () => {
    setFormData({ skill_name: '', skill_code: '', description: '', category_id: '', is_active: true });
    setEditingSkill(null);
    setNewCategory('');
    setShowNewCategoryInput(false);
  };

  const handleAddNewCategory = async () => {
    if (!newCategory.trim()) return;
    
    try {
      const response = await api.post('/skill-categories', { category_name: newCategory });
      const newCat = response.data?.data;
      setCategories([...categories, newCat]);
      setFormData({...formData, category_id: newCat.id.toString()});
      setNewCategory('');
      setShowNewCategoryInput(false);
      alert.success('Success', 'Category added successfully');
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to add category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingSkill) {
        await api.put(`/skills/${editingSkill.id}`, formData);
        alert.success('Success', 'Skill updated successfully');
      } else {
        await api.post('/skills', formData);
        alert.success('Success', 'Skill created successfully');
      }
      setShowModal(false);
      resetForm();
      loadSkills();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to save skill');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Skills Management</h1>
            <p className="text-indigo-100">Manage technician skills and trades</p>
          </div>
          <button
            onClick={() => { setShowModal(true); resetForm(); }}
            className="bg-white text-indigo-600 px-3 py-1.5 text-sm rounded-lg hover:bg-indigo-50 transition-all font-semibold shadow-lg inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="border-b">
          <div className="flex">
            <button onClick={() => setActiveTab('active')} className={`px-6 py-3 font-medium ${activeTab === 'active' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600'}`}>
              Active ({skills.filter(s => s.is_active).length})
            </button>
            <button onClick={() => setActiveTab('inactive')} className={`px-6 py-3 font-medium ${activeTab === 'inactive' ? 'border-b-2 border-gray-600 text-gray-600' : 'text-gray-600'}`}>
              Inactive ({skills.filter(s => !s.is_active).length})
            </button>
            <button onClick={() => setActiveTab('all')} className={`px-6 py-3 font-medium ${activeTab === 'all' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-600'}`}>
              All ({skills.length})
            </button>
          </div>
        </div>
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Skill Code</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Skill Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : filteredSkills.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No skills found</td></tr>
              ) : (
                filteredSkills.map((skill) => (
                  <tr key={skill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{skill.skill_code}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{skill.name}</td>
                    <td className="px-6 py-4 text-gray-600">{skill.category || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{skill.description || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        skill.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {skill.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(skill)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(skill.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingSkill ? 'Edit Skill' : 'Add Skill'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Skill Name *</label>
            <input
              required
              value={formData.skill_name}
              onChange={(e) => setFormData({...formData, skill_name: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Mechanical, Electrical"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Skill Code *</label>
            <input
              required
              value={formData.skill_code}
              onChange={(e) => setFormData({...formData, skill_code: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., MECH, ELEC"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <div className="space-y-2">
              <select
                value={formData.category_id}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewCategoryInput(true);
                  } else {
                    setFormData({...formData, category_id: e.target.value});
                  }
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                ))}
                <option value="__new__">+ Add New Category</option>
              </select>
              
              {showNewCategoryInput && (
                <div className="flex gap-2">
                  <input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                    className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddNewCategory()}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewCategory}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNewCategoryInput(false); setNewCategory(''); }}
                    className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Skill description..."
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label className="ml-2 text-sm text-gray-700">Active</label>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-indigo-600 text-white px-3 py-1.5 text-sm rounded-lg hover:bg-indigo-700 transition-all font-semibold disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (editingSkill ? 'Update' : 'Create')}
            </button>
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
