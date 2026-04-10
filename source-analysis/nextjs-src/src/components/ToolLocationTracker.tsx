import React, { useState, useEffect } from 'react';

interface ToolLocation {
  id: number;
  name: string;
  code: string;
  category: string;
  latitude: number;
  longitude: number;
  location_name: string;
  location_type: string;
  accuracy: number;
  updated_at: string;
  updated_by_name: string;
}

interface LocationZone {
  id: number;
  name: string;
  description: string;
  center_latitude: number;
  center_longitude: number;
  radius: number;
}

const ToolLocationTracker: React.FC = () => {
  const [toolLocations, setToolLocations] = useState<ToolLocation[]>([]);
  const [zones, setZones] = useState<LocationZone[]>([]);
  const [selectedTool, setSelectedTool] = useState<number | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{lat: number, lng: number} | null>(null);
  const [updateData, setUpdateData] = useState({
    location_name: '',
    location_type: 'MANUAL'
  });
  const [zoneData, setZoneData] = useState({
    name: '',
    description: '',
    center_latitude: '',
    center_longitude: '',
    radius: '50'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchToolLocations();
    fetchZones();
    getCurrentPosition();
  }, []);

  const getCurrentPosition = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Error getting location:', error)
      );
    }
  };

  const fetchToolLocations = async () => {
    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-location/current', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setToolLocations(data.data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchZones = async () => {
    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-location/zones', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setZones(data.data);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const updateToolLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const locationData = {
        tool_id: selectedTool,
        ...updateData,
        ...(updateData.location_type === 'GPS' && currentPosition ? {
          latitude: currentPosition.lat,
          longitude: currentPosition.lng
        } : {})
      };

      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-location/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(locationData)
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('Location updated successfully');
        setShowUpdateModal(false);
        fetchToolLocations();
        setUpdateData({ location_name: '', location_type: 'MANUAL' });
      } else {
        alert(data.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      alert('Error updating location');
    } finally {
      setLoading(false);
    }
  };

  const createZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-location/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(zoneData)
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('Zone created successfully');
        setShowZoneModal(false);
        fetchZones();
        setZoneData({ name: '', description: '', center_latitude: '', center_longitude: '', radius: '50' });
      } else {
        alert(data.message || 'Creation failed');
      }
    } catch (error) {
      console.error('Error creating zone:', error);
      alert('Error creating zone');
    } finally {
      setLoading(false);
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'GPS': return '📍';
      case 'ZONE': return '🏢';
      case 'BUILDING': return '🏭';
      default: return '📌';
    }
  };

  const getLocationColor = (type: string) => {
    switch (type) {
      case 'GPS': return 'text-green-600';
      case 'ZONE': return 'text-blue-600';
      case 'BUILDING': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Tool Location Tracker</h1>
        
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => fetchToolLocations()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => setShowZoneModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            ➕ Add Zone
          </button>
        </div>

        {currentPosition && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              📍 Your current location: {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tool Locations List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Tool Locations</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {toolLocations.map(tool => (
                <div key={tool.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-lg ${getLocationColor(tool.location_type)}`}>
                          {getLocationIcon(tool.location_type)}
                        </span>
                        <h4 className="font-medium text-gray-900">{tool.name}</h4>
                        <span className="text-sm text-gray-500">({tool.code})</span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">Category:</span> {tool.category}</p>
                        {tool.location_name && (
                          <p><span className="font-medium">Location:</span> {tool.location_name}</p>
                        )}
                        {tool.latitude && tool.longitude && (
                          <p><span className="font-medium">Coordinates:</span> {tool.latitude.toFixed(6)}, {tool.longitude.toFixed(6)}</p>
                        )}
                        {tool.updated_at && (
                          <p><span className="font-medium">Updated:</span> {new Date(tool.updated_at).toLocaleString()}</p>
                        )}
                        {tool.updated_by_name && (
                          <p><span className="font-medium">By:</span> {tool.updated_by_name}</p>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedTool(tool.id);
                        setShowUpdateModal(true);
                      }}
                      className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zones List */}
        <div>
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Location Zones</h3>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {zones.map(zone => (
                <div key={zone.id} className="p-4">
                  <h4 className="font-medium text-gray-900 mb-1">{zone.name}</h4>
                  {zone.description && (
                    <p className="text-sm text-gray-600 mb-2">{zone.description}</p>
                  )}
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Center: {zone.center_latitude.toFixed(6)}, {zone.center_longitude.toFixed(6)}</p>
                    <p>Radius: {zone.radius}m</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Update Location Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Update Tool Location</h3>
            
            <form onSubmit={updateToolLocation}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Type</label>
                <select
                  value={updateData.location_type}
                  onChange={(e) => setUpdateData({...updateData, location_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MANUAL">Manual Entry</option>
                  <option value="GPS">Current GPS</option>
                  <option value="ZONE">Zone</option>
                  <option value="BUILDING">Building</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Location Name</label>
                <input
                  type="text"
                  value={updateData.location_name}
                  onChange={(e) => setUpdateData({...updateData, location_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Workshop A, Storage Room 2"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create Location Zone</h3>
            
            <form onSubmit={createZone}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Zone Name</label>
                <input
                  type="text"
                  value={zoneData.name}
                  onChange={(e) => setZoneData({...zoneData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={zoneData.description}
                  onChange={(e) => setZoneData({...zoneData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={zoneData.center_latitude}
                    onChange={(e) => setZoneData({...zoneData, center_latitude: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={zoneData.center_longitude}
                    onChange={(e) => setZoneData({...zoneData, center_longitude: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Radius (meters)</label>
                <input
                  type="number"
                  value={zoneData.radius}
                  onChange={(e) => setZoneData({...zoneData, radius: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowZoneModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolLocationTracker;