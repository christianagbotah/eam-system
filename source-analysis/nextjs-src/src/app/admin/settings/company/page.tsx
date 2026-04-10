'use client';

import { useState, useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function CompanySettings() {
  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    country_code: '',
    language_code: 'en',
    currency_code: 'USD',
    timezone: 'UTC',
    tax_id: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error'>('success');

  const handleExport = () => {
    showToast.success('Company settings exported');
  };

  useKeyboardShortcuts({ onExport: handleExport });

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
    }, 300);
  };

  useEffect(() => {
    if (showModal && modalType === 'success') {
      const timer = setTimeout(() => {
        closeModal();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showModal, modalType]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/v1/eam/settings/company`);
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        setFormData(data.data);
      }
    } catch (error) {
      showToast.error('Failed to fetch settings');
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('company_name', formData.company_name);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('website', formData.website);
      formDataToSend.append('country_code', formData.country_code);
      formDataToSend.append('language_code', formData.language_code);
      formDataToSend.append('currency_code', formData.currency_code);
      formDataToSend.append('timezone', formData.timezone);
      formDataToSend.append('tax_id', formData.tax_id);
      if (logoFile) {
        formDataToSend.append('logo', logoFile);
      }

      const response = await fetch(`/api/v1/eam/settings/company`, {
        method: 'POST',
        body: formDataToSend
      });
      const result = await response.json();
      if (response.ok && result.status === 'success') {
        setModalType('success');
        setModalMessage('Company settings saved successfully!');
        setShowModal(true);
        setLogoPreview('');
        setLogoFile(null);
        fetchSettings();
      } else {
        setModalType('error');
        setModalMessage(result.message || 'Failed to save settings. Please try again.');
        setShowModal(true);
      }
    } catch (error) {
      showToast.error('An error occurred while saving settings');
      setModalType('error');
      setModalMessage('An error occurred while saving settings.');
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="p-6">
        <h1 className="text-lg font-semibold text-gray-800 mb-6">Company Settings</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="md:col-span-3 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-3 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                {(logoPreview || formData.logo) && (
                  <div className="mb-2">
                    <img src={logoPreview || formData.logo} alt="Company Logo" className="h-20 w-auto border rounded" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-3 lg:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="www.example.com"
                />
              </div>
            </div>

            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🌍 International Settings (ISO Standards)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country Code (ISO 3166-1) *
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="US"
                    value={formData.country_code}
                    onChange={(e) => setFormData({ ...formData, country_code: e.target.value.toUpperCase() })}
                    className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">2-letter code (e.g., US, GB, DE)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language (ISO 639-1) *
                  </label>
                  <select
                    value={formData.language_code}
                    onChange={(e) => setFormData({ ...formData, language_code: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="en">English (en)</option>
                    <option value="es">Spanish (es)</option>
                    <option value="fr">French (fr)</option>
                    <option value="de">German (de)</option>
                    <option value="zh">Chinese (zh)</option>
                    <option value="ja">Japanese (ja)</option>
                    <option value="ar">Arabic (ar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency (ISO 4217) *
                  </label>
                  <select
                    value={formData.currency_code}
                    onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="CNY">CNY - Chinese Yuan</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone *
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Chicago">America/Chicago (CST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Paris">Europe/Paris (CET)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                    <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID / VAT Number
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    className="w-full px-2 py-1 text-xs border rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 12-3456789"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showModal && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}>
          <div className={`bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center ${isClosing ? 'animate-drop-down' : 'animate-scale-in'}`}>
            <div className="flex justify-center mb-6">
              {modalType === 'success' ? (
                <div className="relative">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                    <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              {modalType === 'success' ? 'Success!' : 'Error!'}
            </h3>
            <p className="text-gray-600 mb-6">{modalMessage}</p>
            <button
              onClick={closeModal}
              className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
