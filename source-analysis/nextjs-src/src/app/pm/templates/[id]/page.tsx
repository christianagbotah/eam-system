'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { pmService, PMTemplate } from '@/services/pmService';
import { toast } from 'react-hot-toast';
import PMTemplateForm from '@/components/pm/PMTemplateForm';
import BackButton from '@/components/BackButton';

export default function PMTemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [template, setTemplate] = useState<PMTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadTemplate();
    }
  }, [params.id]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await pmService.getTemplate(Number(params.id));
      if (response.success) {
        setTemplate(response.data);
      } else {
        toast.error('Template not found');
        router.push('/pm/templates');
      }
    } catch (error) {
      toast.error('Failed to load template');
      router.push('/pm/templates');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      setSaving(true);
      const response = await pmService.updateTemplate(Number(params.id), data);
      if (response.success) {
        toast.success('Template updated successfully');
        setEditing(false);
        loadTemplate();
      } else {
        toast.error(response.error || 'Failed to update template');
      }
    } catch (error) {
      toast.error('Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Template Not Found</h1>
          <p className="text-gray-600 mt-2">The requested PM template could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:relative">
      <BackButton />
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{template.title}</h1>
          <p className="text-gray-600">{template.code}</p>
        </div>
        <div className="space-x-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Edit
            </button>
          )}
          <button
            onClick={() => router.push('/pm/templates')}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Back to Templates
          </button>
        </div>
      </div>

      {editing ? (
        <PMTemplateForm
          initialData={template}
          onSubmit={handleUpdate}
          loading={saving}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Template Details</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="text-sm text-gray-900">{template.description || 'No description'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Asset Type</dt>
                    <dd className="text-sm text-gray-900 capitalize">{template.asset_node_type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Maintenance Type</dt>
                    <dd className="text-sm text-gray-900 capitalize">{template.maintenance_type}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Priority</dt>
                    <dd className="text-sm text-gray-900">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        template.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        template.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {template.priority}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Estimated Hours</dt>
                    <dd className="text-sm text-gray-900">{template.estimated_hours}h</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="text-sm text-gray-900">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {template.active ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Triggers</h3>
                {template.triggers && template.triggers.length > 0 ? (
                  <div className="space-y-2">
                    {template.triggers.map((trigger, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded">
                        <div className="text-sm font-medium capitalize">{trigger.trigger_type}</div>
                        <div className="text-xs text-gray-600">
                          {trigger.trigger_type === 'time' && `Every ${trigger.period_days} days`}
                          {trigger.trigger_type === 'usage' && `Every ${trigger.usage_threshold} units`}
                          {trigger.trigger_type === 'production' && `Every ${trigger.usage_threshold} ${trigger.production_metric}`}
                          {trigger.trigger_type === 'event' && trigger.event_name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No triggers configured</p>
                )}
              </div>
            </div>

            {template.checklists && template.checklists.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">Checklists</h3>
                <div className="space-y-4">
                  {template.checklists.map((checklist) => (
                    <div key={checklist.id} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{checklist.title}</h4>
                      {checklist.items && checklist.items.length > 0 && (
                        <ul className="space-y-1">
                          {checklist.items.map((item) => (
                            <li key={item.id} className="text-sm text-gray-600 flex items-center">
                              <span className={`px-2 py-1 text-xs rounded mr-2 ${
                                item.item_type === 'yesno' ? 'bg-blue-100 text-blue-800' :
                                item.item_type === 'passfail' ? 'bg-green-100 text-green-800' :
                                item.item_type === 'numeric' ? 'bg-yellow-100 text-yellow-800' :
                                item.item_type === 'photo' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {item.item_type}
                              </span>
                              {item.item_text}
                              {item.required && <span className="text-red-500 ml-1">*</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}