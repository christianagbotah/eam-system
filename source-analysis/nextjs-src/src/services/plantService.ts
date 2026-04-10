import api from '@/lib/api';

export interface Plant {
  id: number;
  plant_code: string;
  plant_name: string;
  location: string;
  is_active: number;
}

export const plantService = {
  // Get plants accessible by current user
  getUserPlants: async (): Promise<Plant[]> => {
    const response = await api.get('/plants/user/plants');
    return response.data.data;
  },

  // Switch active plant
  switchPlant: async (plantId: number): Promise<void> => {
    await api.post('/plants/user/switch-plant', { plant_id: plantId });
    localStorage.setItem('active_plant_id', plantId.toString());
  },

  // Get active plant ID
  getActivePlantId: (): number | null => {
    const plantId = localStorage.getItem('active_plant_id');
    return plantId ? parseInt(plantId) : null;
  },

  // Clear active plant
  clearActivePlant: (): void => {
    localStorage.removeItem('active_plant_id');
  },
};
