'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState({ type: 'suggestion', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Feedback submitted successfully');
    setFeedback({ type: 'suggestion', message: '' });
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
          <p className="text-gray-600 mt-1">Share your thoughts and suggestions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Feedback Type</label>
              <select value={feedback.type} onChange={(e) => setFeedback({ ...feedback, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="suggestion">Suggestion</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea value={feedback.message} onChange={(e) => setFeedback({ ...feedback, message: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" rows={6} placeholder="Share your feedback..." required />
            </div>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold inline-flex items-center gap-2">
              <Send className="w-4 h-4" />
              Submit Feedback
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
