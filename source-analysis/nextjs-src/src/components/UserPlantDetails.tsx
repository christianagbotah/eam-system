'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Building2, MapPin, Star } from 'lucide-react';

interface UserPlantDetailsProps {
  userId: number;
}

export default function UserPlantDetails({ userId }: UserPlantDetailsProps) {
  const [plants, setPlants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserPlants();
  }, [userId]);

  const loadUserPlants = async () => {
    try {
      const res = await api.get(`/users/${userId}/plants`);
      const plantsData = res.data?.data || [];
      setPlants(plantsData);
    } catch (error) {
      console.error('Error loading user plants:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading plants...</div>;
  }

  if (plants.length === 0) {
    return (
      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
        No plants assigned
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-700">Assigned Plants ({plants.length})</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {plants.map((plant) => (
          <div
            key={plant.id}
            className={`p-3 rounded-lg border ${
              plant.is_primary
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <Building2 className={`w-4 h-4 mt-0.5 ${plant.is_primary ? 'text-blue-600' : 'text-gray-400'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{plant.plant_name}</span>
                    {plant.is_primary && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" title="Primary Plant" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{plant.plant_code}</div>
                  {plant.location && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                      <MapPin className="w-3 h-3" />
                      {plant.location}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
