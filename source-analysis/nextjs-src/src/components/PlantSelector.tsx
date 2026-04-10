'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { plantService, Plant } from '@/services/plantService';

export default function PlantSelector() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [currentPlant, setCurrentPlant] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedPlant = plantService.getActivePlantId();
    if (storedPlant !== null) {
      setCurrentPlant(storedPlant);
    }

    plantService.getUserPlants()
      .then((data) => {
        setPlants(data);
        if (storedPlant === null && data.length > 0) {
          const defaultPlant = data[0].id;
          setCurrentPlant(defaultPlant);
          localStorage.setItem('active_plant_id', defaultPlant.toString());
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = async (plantId: number) => {
    try {
      console.log('Switching to plant:', plantId);
      setCurrentPlant(plantId);
      
      // Special handling for "All Plants" (plantId = 0)
      if (plantId === 0) {
        localStorage.setItem('active_plant_id', '0');
        localStorage.setItem('view_all_plants', 'true');
      } else {
        localStorage.setItem('active_plant_id', plantId.toString());
        localStorage.removeItem('view_all_plants');
        await plantService.switchPlant(plantId);
      }
      
      // Force full page reload to refresh all data with new plant
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch plant:', error);
      setCurrentPlant(currentPlant);
    }
  };

  if (loading || plants.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border">
      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <span className="text-sm font-medium text-gray-700">Plant:</span>
      <select
        value={currentPlant || ''}
        onChange={(e) => handleChange(parseInt(e.target.value))}
        className="border-gray-300 rounded-md text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="0">All Plants (Aggregated)</option>
        {plants.map((plant) => (
          <option key={plant.id} value={plant.id}>
            {plant.plant_name}
          </option>
        ))}
      </select>
    </div>
  );
}
