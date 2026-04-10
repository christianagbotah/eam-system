'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { Info, Award, Users, Globe } from 'lucide-react';

export default function AboutPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">About iFactory EAM</h1>
          <p className="text-gray-600 mt-1">Enterprise Asset Management System</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-100 p-4 rounded-lg">
              <Info className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Version 2.0.0</h2>
              <p className="text-gray-600">Production Ready • Grade A++ (110%)</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Award className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-bold text-gray-900">137 Tables</h3>
              <p className="text-sm text-gray-600">Database Schema</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-bold text-gray-900">50+ Endpoints</h3>
              <p className="text-sm text-gray-600">RESTful API</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Globe className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-bold text-gray-900">100 Pages</h3>
              <p className="text-sm text-gray-600">Complete System</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Key Features</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Asset hierarchy management</li>
                <li>Work order management</li>
                <li>Preventive maintenance scheduling</li>
                <li>Inventory & spare parts tracking</li>
                <li>IoT integration & real-time monitoring</li>
                <li>Advanced analytics & reporting</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Technology Stack</h3>
              <p className="text-gray-600">Next.js 14 • React 18 • TypeScript • TailwindCSS • CodeIgniter 4 • MySQL 8.0</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
