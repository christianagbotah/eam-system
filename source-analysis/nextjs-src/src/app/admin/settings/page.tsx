'use client';

import Link from 'next/link';
import RBACGuard from '@/components/RBACGuard';

function SettingsContent() {
  const settingsCategories = [
    {
      title: 'Company Settings',
      description: 'Manage company information, logo, and branding',
      icon: '🏢',
      href: '/admin/settings/company',
      color: 'blue'
    },
    {
      title: 'System Settings',
      description: 'Configure system preferences and defaults',
      icon: '⚙️',
      href: '/admin/settings/system',
      color: 'purple'
    },
    {
      title: 'Roles & Permissions',
      description: 'Manage user roles and access control',
      icon: '🔐',
      href: '/admin/settings/roles',
      color: 'green'
    },
    {
      title: 'Users',
      description: 'Manage system users and accounts',
      icon: '👥',
      href: '/admin/users',
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
      green: 'bg-green-100 text-green-600 hover:bg-green-200',
      orange: 'bg-orange-100 text-orange-600 hover:bg-orange-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-600 mt-0.5">Configure your system preferences and settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {settingsCategories.map((category) => (
          <Link
            key={category.href}
            href={category.href}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-2">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-colors ${getColorClasses(category.color)}`}>
                {category.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {category.title}
                </h3>
                <p className="text-sm text-xs text-gray-600 mt-0.5">{category.description}</p>
                <div className="flex items-center gap-2 mt-3 text-blue-600 text-sm font-medium">
                  Configure
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-start gap-2">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-gray-700 mb-4">
              Check our documentation or contact support for assistance with system configuration.
            </p>
            <div className="flex gap-3">
              <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                View Documentation
              </button>
              <button className="px-2 py-1 text-xs bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium border border-gray-200">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RBACGuard module="settings" action="view">
      <SettingsContent />
    </RBACGuard>
  );
}
