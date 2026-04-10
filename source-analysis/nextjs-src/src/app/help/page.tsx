'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { HelpCircle, Book, Video, MessageCircle } from 'lucide-react';

export default function HelpPage() {
  const helpTopics = [
    { id: 1, title: 'Getting Started', description: 'Learn the basics of the system', icon: Book },
    { id: 2, title: 'User Guide', description: 'Complete user documentation', icon: Book },
    { id: 3, title: 'Video Tutorials', description: 'Watch step-by-step guides', icon: Video },
    { id: 4, title: 'FAQs', description: 'Frequently asked questions', icon: HelpCircle },
    { id: 5, title: 'Contact Support', description: 'Get help from our team', icon: MessageCircle },
    { id: 6, title: 'API Documentation', description: 'Developer resources', icon: Book }
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
          <p className="text-gray-600 mt-1">Find answers and get support</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {helpTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <div key={topic.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{topic.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
