import api from '@/lib/api';

export interface CompanyProfile {
  id: number;
  name: string;
  logo?: string;
  currency: 'GHS' | 'USD' | 'EUR';
  timezone: string;
  country: string;
  industry: string;
  shiftModel: 'continuous' | 'day_only' | 'two_shift' | 'three_shift';
  unionSettings: {
    hasUnion: boolean;
    unionName?: string;
    requiresNotification: boolean;
    breakDurationMinutes: number;
  };
  slaTemplates: {
    critical: { responseMinutes: number; repairHours: number };
    high: { responseMinutes: number; repairHours: number };
    medium: { responseMinutes: number; repairHours: number };
    low: { responseMinutes: number; repairHours: number };
  };
}

export interface PlantStructure {
  plantId: number;
  plantName: string;
  areas: Array<{
    areaId: number;
    areaName: string;
    lines: Array<{
      lineId: number;
      lineName: string;
      machines: Array<{
        machineId: number;
        machineName: string;
        assetCode: string;
      }>;
    }>;
  }>;
}

export class EnterpriseConfigService {
  
  /**
   * Get company profile
   */
  async getCompanyProfile(): Promise<CompanyProfile> {
    const response = await api.get('/company/profile');
    return response.data.data;
  }

  /**
   * Update company profile
   */
  async updateCompanyProfile(profile: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const response = await api.put('/company/profile', profile);
    return response.data.data;
  }

  /**
   * Initialize company for Ghana industrial deployment
   */
  async initializeGhanaCompany(companyData: {
    name: string;
    industry: 'manufacturing' | 'utilities' | 'mining' | 'oil_gas';
    plantCount: number;
    employeeCount: number;
    hasUnion: boolean;
  }): Promise<{
    companyProfile: CompanyProfile;
    plantStructure: PlantStructure[];
    defaultSettings: any;
  }> {
    // Create Ghana-optimized company profile
    const ghanaProfile: Partial<CompanyProfile> = {
      name: companyData.name,
      currency: 'GHS',
      timezone: 'Africa/Accra',
      country: 'Ghana',
      industry: companyData.industry,
      shiftModel: companyData.industry === 'manufacturing' ? 'three_shift' : 'day_only',
      unionSettings: {
        hasUnion: companyData.hasUnion,
        unionName: companyData.hasUnion ? 'Ghana Workers Union' : undefined,
        requiresNotification: companyData.hasUnion,
        breakDurationMinutes: 60
      },
      slaTemplates: this.getGhanaSLATemplates(companyData.industry)
    };

    const response = await api.post('/company/initialize-ghana', {
      profile: ghanaProfile,
      plantCount: companyData.plantCount,
      employeeCount: companyData.employeeCount
    });

    return response.data.data;
  }

  /**
   * Configure plant structure wizard
   */
  async configurePlantStructure(plantData: {
    plantName: string;
    location: string;
    areas: Array<{
      name: string;
      lines: Array<{
        name: string;
        machineCount: number;
      }>;
    }>;
  }): Promise<PlantStructure> {
    const response = await api.post('/company/configure-plant', plantData);
    return response.data.data;
  }

  /**
   * Get deployment-ready configuration
   */
  async getDeploymentConfig(): Promise<{
    companyProfile: CompanyProfile;
    plantStructures: PlantStructure[];
    masterDataTemplates: any;
    reportBranding: any;
    workflowTemplates: any;
  }> {
    const response = await api.get('/company/deployment-config');
    return response.data.data;
  }

  /**
   * Validate deployment readiness
   */
  async validateDeploymentReadiness(): Promise<{
    isReady: boolean;
    checklist: Array<{
      item: string;
      status: 'complete' | 'incomplete' | 'optional';
      description: string;
    }>;
    criticalIssues: string[];
  }> {
    const checklist = [
      { item: 'Company Profile', status: 'incomplete' as const, description: 'Basic company information' },
      { item: 'Plant Structure', status: 'incomplete' as const, description: 'Asset hierarchy definition' },
      { item: 'User Roles', status: 'incomplete' as const, description: 'Role-based access control' },
      { item: 'SLA Templates', status: 'incomplete' as const, description: 'Service level agreements' },
      { item: 'Master Data', status: 'optional' as const, description: 'Failure codes, parts classification' },
      { item: 'Report Branding', status: 'optional' as const, description: 'Company logo and styling' }
    ];

    try {
      // Check company profile
      const profile = await this.getCompanyProfile();
      if (profile.name && profile.currency && profile.timezone) {
        checklist[0].status = 'complete';
      }

      // Check plant structure
      const plants = await api.get('/company/plants');
      if (plants.data.data.length > 0) {
        checklist[1].status = 'complete';
      }

      // Check user roles
      const roles = await api.get('/company/roles');
      if (roles.data.data.length >= 5) { // Minimum required roles
        checklist[2].status = 'complete';
      }

      // Check SLA templates
      if (profile.slaTemplates) {
        checklist[3].status = 'complete';
      }

    } catch (error) {
      console.error('Deployment validation error:', error);
    }

    const criticalIssues = checklist
      .filter(item => item.status === 'incomplete' && item.item !== 'Master Data' && item.item !== 'Report Branding')
      .map(item => item.item);

    return {
      isReady: criticalIssues.length === 0,
      checklist,
      criticalIssues
    };
  }

  /**
   * Export deployment package
   */
  async exportDeploymentPackage(): Promise<{
    configurationFile: string;
    migrationScripts: string[];
    documentationUrl: string;
  }> {
    const response = await api.post('/company/export-deployment');
    return response.data.data;
  }

  /**
   * Get Ghana-specific SLA templates by industry
   */
  private getGhanaSLATemplates(industry: string) {
    const templates = {
      manufacturing: {
        critical: { responseMinutes: 15, repairHours: 2 },
        high: { responseMinutes: 30, repairHours: 4 },
        medium: { responseMinutes: 60, repairHours: 8 },
        low: { responseMinutes: 240, repairHours: 24 }
      },
      utilities: {
        critical: { responseMinutes: 10, repairHours: 1 },
        high: { responseMinutes: 20, repairHours: 2 },
        medium: { responseMinutes: 45, repairHours: 6 },
        low: { responseMinutes: 120, repairHours: 12 }
      },
      mining: {
        critical: { responseMinutes: 20, repairHours: 4 },
        high: { responseMinutes: 45, repairHours: 8 },
        medium: { responseMinutes: 90, repairHours: 12 },
        low: { responseMinutes: 360, repairHours: 48 }
      },
      oil_gas: {
        critical: { responseMinutes: 5, repairHours: 1 },
        high: { responseMinutes: 15, repairHours: 2 },
        medium: { responseMinutes: 30, repairHours: 4 },
        low: { responseMinutes: 60, repairHours: 8 }
      }
    };

    return templates[industry as keyof typeof templates] || templates.manufacturing;
  }

  /**
   * Get Ghana industrial companies presets
   */
  getGhanaIndustrialPresets(): Array<{
    name: string;
    industry: string;
    description: string;
    recommendedConfig: Partial<CompanyProfile>;
  }> {
    return [
      {
        name: 'Large Manufacturing (GTP Style)',
        industry: 'manufacturing',
        description: 'Textile and garment manufacturing with 3-shift operations',
        recommendedConfig: {
          shiftModel: 'three_shift',
          unionSettings: {
            hasUnion: true,
            unionName: 'Ghana Textile Workers Union',
            requiresNotification: true,
            breakDurationMinutes: 60
          }
        }
      },
      {
        name: 'FMCG Manufacturing (Unilever Style)',
        industry: 'manufacturing',
        description: 'Fast-moving consumer goods with continuous operations',
        recommendedConfig: {
          shiftModel: 'continuous',
          unionSettings: {
            hasUnion: true,
            unionName: 'Food and Allied Workers Union',
            requiresNotification: true,
            breakDurationMinutes: 45
          }
        }
      },
      {
        name: 'Brewery Operations (Guinness Style)',
        industry: 'manufacturing',
        description: 'Beverage production with quality-critical processes',
        recommendedConfig: {
          shiftModel: 'continuous',
          slaTemplates: {
            critical: { responseMinutes: 10, repairHours: 1 },
            high: { responseMinutes: 20, repairHours: 2 },
            medium: { responseMinutes: 45, repairHours: 4 },
            low: { responseMinutes: 120, repairHours: 8 }
          }
        }
      },
      {
        name: 'Industrial Zone Manufacturing',
        industry: 'manufacturing',
        description: 'Tema Industrial Zone style multi-product facility',
        recommendedConfig: {
          shiftModel: 'two_shift',
          unionSettings: {
            hasUnion: true,
            requiresNotification: true,
            breakDurationMinutes: 60
          }
        }
      },
      {
        name: 'Utility Operations',
        industry: 'utilities',
        description: 'Power generation and distribution',
        recommendedConfig: {
          shiftModel: 'continuous',
          slaTemplates: {
            critical: { responseMinutes: 5, repairHours: 0.5 },
            high: { responseMinutes: 15, repairHours: 1 },
            medium: { responseMinutes: 30, repairHours: 2 },
            low: { responseMinutes: 60, repairHours: 4 }
          }
        }
      }
    ];
  }
}

export default new EnterpriseConfigService();