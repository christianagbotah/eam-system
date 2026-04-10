'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function TestAuth() {
  const [result, setResult] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    setToken(storedToken);
  }, []);

  const testAPI = async () => {
    try {
      const response = await api.get('/assets-unified');
      setResult({ success: true, data: response.data });
    } catch (error: any) {
      setResult({ 
        success: false, 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data 
      });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-base font-semibold mb-4">Auth Test</h1>
      
      <div className="mb-4">
        <h2 className="font-bold">Token:</h2>
        <pre className="bg-gray-100 p-2 rounded text-xs">
          {token || 'No token'}
        </pre>
      </div>

      <button 
        onClick={testAPI}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Test API
      </button>

      {result && (
        <div className="mt-4">
          <pre className="bg-gray-100 p-2 rounded text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
