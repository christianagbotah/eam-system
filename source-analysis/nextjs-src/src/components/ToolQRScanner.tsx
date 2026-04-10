import React, { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScannedTool {
  id: number;
  name: string;
  code: string;
  category_name: string;
  is_available: boolean;
  current_request?: any;
  actions: string[];
}

const ToolQRScanner: React.FC = () => {
  const [scannedTool, setScannedTool] = useState<ScannedTool | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    purpose: '',
    expected_return_date: ''
  });
  const [checkinData, setCheckinData] = useState({
    condition: 'GOOD',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (showScanner) {
      initScanner();
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [showScanner]);

  const initScanner = () => {
    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current.render(onScanSuccess, onScanFailure);
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      setLoading(true);
      
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-qr/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ qr_data: btoa(decodedText) })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setScannedTool(data.data);
        setShowScanner(false);
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
      } else {
        alert(data.message || 'Invalid QR code');
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('Error processing QR code');
    } finally {
      setLoading(false);
    }
  };

  const onScanFailure = (error: string) => {
    // Silent fail for continuous scanning
  };

  const handleQuickCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-qr/quick-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tool_id: scannedTool?.id,
          ...checkoutData
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('Tool checked out successfully!');
        setShowCheckoutModal(false);
        setScannedTool(null);
        setCheckoutData({ purpose: '', expected_return_date: '' });
      } else {
        alert(data.message || 'Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error during checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-qr/quick-checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tool_id: scannedTool?.id,
          ...checkinData
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('Tool checked in successfully!');
        setShowCheckinModal(false);
        setScannedTool(null);
        setCheckinData({ condition: 'GOOD', notes: '' });
      } else {
        alert(data.message || 'Checkin failed');
      }
    } catch (error) {
      console.error('Checkin error:', error);
      alert('Error during checkin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Tool QR Scanner</h1>
        
        {!showScanner && !scannedTool && (
          <button
            onClick={() => setShowScanner(true)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700"
          >
            📱 Start Scanning
          </button>
        )}
      </div>

      {showScanner && (
        <div className="mb-6">
          <div id="qr-reader" className="w-full"></div>
          <button
            onClick={() => {
              setShowScanner(false);
              if (scannerRef.current) {
                scannerRef.current.clear();
              }
            }}
            className="mt-4 w-full bg-gray-600 text-white py-2 px-4 rounded-lg"
          >
            Cancel Scan
          </button>
        </div>
      )}

      {scannedTool && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{scannedTool.name}</h3>
            <span className={`px-2 py-1 rounded text-sm font-medium ${
              scannedTool.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {scannedTool.is_available ? 'Available' : 'In Use'}
            </span>
          </div>
          
          <div className="space-y-2 mb-4">
            <p><span className="font-medium">Code:</span> {scannedTool.code}</p>
            <p><span className="font-medium">Category:</span> {scannedTool.category_name}</p>
            {scannedTool.current_request && (
              <p><span className="font-medium">Issued to:</span> {scannedTool.current_request.issued_to}</p>
            )}
          </div>

          <div className="space-y-2">
            {scannedTool.actions.includes('checkout') && (
              <button
                onClick={() => setShowCheckoutModal(true)}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
              >
                📤 Quick Checkout
              </button>
            )}
            
            {scannedTool.actions.includes('checkin') && (
              <button
                onClick={() => setShowCheckinModal(true)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                📥 Quick Check-in
              </button>
            )}
            
            <button
              onClick={() => setScannedTool(null)}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
            >
              🔄 Scan Another
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 max-w-full">
            <h3 className="text-lg font-semibold mb-4">Quick Checkout</h3>
            
            <form onSubmit={handleQuickCheckout}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                <input
                  type="text"
                  value={checkoutData.purpose}
                  onChange={(e) => setCheckoutData({...checkoutData, purpose: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Expected Return</label>
                <input
                  type="date"
                  value={checkoutData.expected_return_date}
                  onChange={(e) => setCheckoutData({...checkoutData, expected_return_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkin Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 max-w-full">
            <h3 className="text-lg font-semibold mb-4">Quick Check-in</h3>
            
            <form onSubmit={handleQuickCheckin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                <select
                  value={checkinData.condition}
                  onChange={(e) => setCheckinData({...checkinData, condition: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GOOD">Good Condition</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="NEEDS_MAINTENANCE">Needs Maintenance</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={checkinData.notes}
                  onChange={(e) => setCheckinData({...checkinData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Check-in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolQRScanner;