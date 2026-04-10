'use client';

import { useState, useEffect } from 'react';
import { plantService, Plant } from '@/services/plantService';
import api from '@/lib/api';

interface Facility {
  id: number;
  facility_name: string;
  facility_code: string;
  plant_id: number;
}

interface PlantFacilitySelectorProps {
  selectedPlantId?: number;
  selectedFacilityId?: number;
  onPlantChange: (plantId: number) => void;
  onFacilityChange?: (facilityId: number | null) => void;
  required?: boolean;
  disabled?: boolean;
  showFacility?: boolean;
}

export default function PlantFacilitySelector({
  selectedPlantId,
  selectedFacilityId,
  onPlantChange,
  onFacilityChange,
  required = true,
  disabled = false,
  showFacility = true
}: PlantFacilitySelectorProps) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadingPlants, setLoadingPlants] = useState(true);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  // Load user's accessible plants
  useEffect(() => {
    plantService.getUserPlants()
      .then((data) => {
        setPlants(data);
        
        // Auto-select if only one plant
        if (data.length === 1 && !selectedPlantId) {
          onPlantChange(data[0].id);
        }
        // Auto-select active plant from localStorage
        else if (!selectedPlantId) {
          const activePlantId = plantService.getActivePlantId();
          if (activePlantId && data.some(p => p.id === activePlantId)) {
            onPlantChange(activePlantId);
          }
        }
        
        setLoadingPlants(false);
      })
      .catch((error) => {
        console.error('Failed to load plants:', error);
        setLoadingPlants(false);
      });
  }, []);

  // Load facilities when plant changes
  useEffect(() => {
    if (selectedPlantId && showFacility) {
      setLoadingFacilities(true);
      api.get(`/facilities?plant_id=${selectedPlantId}`)
        .then((response) => {
          const facilitiesData = response.data?.data || [];
          setFacilities(facilitiesData);
          setLoadingFacilities(false);
          
          // Auto-select if only one facility
          if (facilitiesData.length === 1 && onFacilityChange) {
            onFacilityChange(facilitiesData[0].id);
          }
        })
        .catch((error) => {
          console.error('Failed to load facilities:', error);
          setFacilities([]);
          setLoadingFacilities(false);
        });
    } else {
      setFacilities([]);
    }
  }, [selectedPlantId, showFacility]);

  const handlePlantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const plantId = parseInt(e.target.value);
    onPlantChange(plantId);
    
    // Reset facility selection when plant changes
    if (onFacilityChange) {
      onFacilityChange(null);
    }
  };

  const handleFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const facilityId = e.target.value ? parseInt(e.target.value) : null;
    if (onFacilityChange) {
      onFacilityChange(facilityId);
    }
  };

  return (
    <>
      {/* Plant Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Plant {required && <span className="text-red-500">*</span>}
          </span>
        </label>
        <select
          value={selectedPlantId || ''}
          onChange={handlePlantChange}
          disabled={disabled || loadingPlants || plants.length === 0}
          required={required}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">
            {loadingPlants ? 'Loading plants...' : plants.length === 0 ? 'No plants available' : 'Select Plant'}
          </option>
          {plants.map((plant) => (
            <option key={plant.id} value={plant.id}>
              {plant.plant_code} - {plant.plant_name} {plant.location ? `(${plant.location})` : ''}
            </option>
          ))}
        </select>
        {plants.length === 0 && !loadingPlants && (
          <p className="mt-1 text-xs text-red-600">
            ⚠️ No plants assigned. Contact administrator.
          </p>
        )}
        {plants.length === 1 && (
          <p className="mt-1 text-xs text-blue-600">
            ℹ️ Auto-selected (only one plant available)
          </p>
        )}
      </div>

      {/* Facility Selector */}
      {showFacility && selectedPlantId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Facility (Optional)
            </span>
          </label>
          <select
            value={selectedFacilityId || ''}
            onChange={handleFacilityChange}
            disabled={disabled || loadingFacilities}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {loadingFacilities ? 'Loading facilities...' : facilities.length === 0 ? 'No facilities in this plant' : 'Select Facility (Optional)'}
            </option>
            {facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.facility_code} - {facility.facility_name}
              </option>
            ))}
          </select>
          {facilities.length === 0 && !loadingFacilities && (
            <p className="mt-1 text-xs text-gray-500">
              No facilities configured for this plant
            </p>
          )}
          {facilities.length === 1 && (
            <p className="mt-1 text-xs text-green-600">
              ℹ️ Auto-selected (only one facility available)
            </p>
          )}
        </div>
      )}
    </>
  );
}
