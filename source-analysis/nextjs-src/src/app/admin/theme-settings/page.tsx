'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { alert } from '@/components/AlertModalProvider';
import { Palette, Check } from 'lucide-react';

const colorOptions = [
  { name: 'Blue', value: 'blue', preview: 'bg-blue-600' },
  { name: 'Indigo', value: 'indigo', preview: 'bg-indigo-600' },
  { name: 'Purple', value: 'purple', preview: 'bg-purple-600' },
  { name: 'Pink', value: 'pink', preview: 'bg-pink-600' },
  { name: 'Red', value: 'red', preview: 'bg-red-600' },
  { name: 'Orange', value: 'orange', preview: 'bg-orange-600' },
  { name: 'Green', value: 'green', preview: 'bg-green-600' },
  { name: 'Teal', value: 'teal', preview: 'bg-teal-600' },
  { name: 'Cyan', value: 'cyan', preview: 'bg-cyan-600' },
  { name: 'Slate', value: 'slate', preview: 'bg-slate-600' }
];

export default function ThemeSettingsPage() {
  const { theme, updateTheme } = useTheme();
  const [formData, setFormData] = useState(theme);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(theme);
  }, [theme]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTheme(formData);
      alert.success('Success', 'Theme updated successfully. Refresh to see changes.');
    } catch (error: any) {
      alert.error('Error', error?.response?.data?.message || 'Failed to update theme');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg shadow-sm border border-gray-200 p-4 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Palette className="w-8 h-8" />
            <h1 className="text-lg font-semibold">Theme Settings</h1>
          </div>
          <p className="text-purple-100">Customize the system-wide color theme</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 space-y-4">
          {/* Primary Color */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">Primary Color</label>
            <div className="grid grid-cols-5 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setFormData({ ...formData, primary: color.value })}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    formData.primary === color.value
                      ? 'border-gray-900 shadow-lg'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className={`w-full h-12 rounded ${color.preview} mb-2`}></div>
                  <p className="text-xs font-medium text-gray-700">{color.name}</p>
                  {formData.primary === color.value && (
                    <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Color */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">Secondary Color</label>
            <div className="grid grid-cols-5 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setFormData({ ...formData, secondary: color.value })}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    formData.secondary === color.value
                      ? 'border-gray-900 shadow-lg'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className={`w-full h-12 rounded ${color.preview} mb-2`}></div>
                  <p className="text-xs font-medium text-gray-700">{color.name}</p>
                  {formData.secondary === color.value && (
                    <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Color */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">Sidebar Color</label>
            <div className="grid grid-cols-5 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setFormData({ ...formData, sidebar: color.value })}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    formData.sidebar === color.value
                      ? 'border-gray-900 shadow-lg'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className={`w-full h-12 rounded ${color.preview} mb-2`}></div>
                  <p className="text-xs font-medium text-gray-700">{color.name}</p>
                  {formData.sidebar === color.value && (
                    <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Preview</h3>
            <div className="space-y-3">
              <div className={`h-16 rounded-lg bg-gradient-to-r from-${formData.primary}-600 to-${formData.secondary}-600 flex items-center justify-center text-white font-bold`}>
                Header Gradient Preview
              </div>
              <div className={`h-16 rounded-lg bg-${formData.primary}-600 flex items-center justify-center text-white font-bold`}>
                Primary Button Preview
              </div>
              <div className={`h-16 rounded-lg bg-gradient-to-b from-${formData.sidebar}-900 to-${formData.sidebar}-800 flex items-center justify-center text-white font-bold`}>
                Sidebar Preview
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pt-6 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Theme'}
            </button>
            <button
              onClick={() => setFormData(theme)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
