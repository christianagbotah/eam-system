'use client';
import { useState, useEffect } from 'react';
import { productionSurveyAdvancedService, SurveyTemplate } from '@/services/productionSurveyAdvanced';
import { FileText, Plus, Edit, Copy } from 'lucide-react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await productionSurveyAdvancedService.getTemplates();
      setTemplates(response.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-base font-semibold">Survey Templates</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <Plus size={20} /> Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {templates.map((template) => (
          <div key={template.template_id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-600" size={24} />
                <div>
                  <h3 className="font-semibold">{template.template_name}</h3>
                  <p className="text-sm text-gray-500">{template.template_code}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {template.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm flex items-center justify-center gap-1">
                <Edit size={16} /> Edit
              </button>
              <button className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded text-sm flex items-center justify-center gap-1">
                <Copy size={16} /> Use
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
