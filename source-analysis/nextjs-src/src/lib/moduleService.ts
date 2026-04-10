import api from './api';

export interface Module {
  id: number;
  code: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  route_prefix: string;
  is_core: boolean;
  is_licensed: boolean;
  is_active: boolean;
  version: string;
}

class ModuleService {
  private activeModulesCache: Module[] | null = null;
  private cacheTimestamp: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getActiveModules(): Promise<Module[]> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.activeModulesCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.activeModulesCache;
    }

    try {
      const response = await api.get('/modules/active');
      this.activeModulesCache = response.data?.data || [];
      this.cacheTimestamp = now;
      return this.activeModulesCache;
    } catch (error) {
      console.error('Failed to fetch active modules:', error);
      return [];
    }
  }

  async getAllModules(): Promise<Module[]> {
    try {
      const response = await api.get('/modules');
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      return [];
    }
  }

  isModuleActive(moduleCode: string): boolean {
    if (!this.activeModulesCache) return true;
    return this.activeModulesCache.some(m => m.code === moduleCode && m.is_active);
  }

  clearCache(): void {
    this.activeModulesCache = null;
    this.cacheTimestamp = 0;
  }
}

export const moduleService = new ModuleService();
