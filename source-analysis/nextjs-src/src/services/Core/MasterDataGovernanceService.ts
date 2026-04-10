import api from '@/lib/api';
import AuditService from '../RWOP/AuditService';

export interface AssetNamingStandard {
  plant: string;
  area: string;
  line: string;
  machine: string;
  assetCode: string;
}

export interface FailureCodeDictionary {
  category: string;
  subcategory: string;
  cause: string;
  code: string;
  description: string;
}

export interface PartsClassification {
  partId: number;
  isCritical: boolean;
  sourceType: 'imported' | 'local' | 'both';
  leadTimeDays: number;
  category: string;
}

export interface TechnicianSkill {
  userId: number;
  skillCode: string;
  skillLevel: 1 | 2 | 3 | 4 | 5;
  certificationDate?: string;
  expiryDate?: string;
  authorizedJobTypes: string[];
}

export class MasterDataGovernanceService {
  
  /**
   * Validate asset naming standard
   */
  async validateAssetNaming(assetData: {
    name: string;
    code: string;
    plant?: string;
    area?: string;
    line?: string;
  }): Promise<{
    isValid: boolean;
    violations: string[];
    suggestedCode?: string;
  }> {
    const violations: string[] = [];
    
    // Check naming convention: PLANT-AREA-LINE-MACHINE
    const codePattern = /^[A-Z]{2,4}-[A-Z]{2,4}-[A-Z0-9]{2,4}-[A-Z0-9]{3,6}$/;
    if (!codePattern.test(assetData.code)) {
      violations.push('Asset code must follow PLANT-AREA-LINE-MACHINE format');
    }

    // Check uniqueness
    try {
      const response = await api.get(`/master-data/assets/validate-code/${assetData.code}`);
      if (!response.data.data.isUnique) {
        violations.push('Asset code already exists');
      }
    } catch (error) {
      violations.push('Unable to validate code uniqueness');
    }

    // Generate suggested code if invalid
    let suggestedCode;
    if (violations.length > 0 && assetData.plant && assetData.area && assetData.line) {
      suggestedCode = await this.generateAssetCode(assetData.plant, assetData.area, assetData.line, assetData.name);
    }

    return {
      isValid: violations.length === 0,
      violations,
      suggestedCode
    };
  }

  /**
   * Validate failure code structure
   */
  async validateFailureCode(failureData: {
    category: string;
    subcategory: string;
    cause: string;
    description: string;
  }): Promise<{
    isValid: boolean;
    violations: string[];
    generatedCode?: string;
  }> {
    const violations: string[] = [];

    // Validate required fields
    if (!failureData.category) violations.push('Category is required');
    if (!failureData.subcategory) violations.push('Subcategory is required');
    if (!failureData.cause) violations.push('Cause is required');
    if (!failureData.description || failureData.description.length < 10) {
      violations.push('Description must be at least 10 characters');
    }

    // Validate category against standard list
    const validCategories = ['MECHANICAL', 'ELECTRICAL', 'INSTRUMENTATION', 'POWER', 'OPERATIONS', 'MATERIALS', 'PLANNED_MAINTENANCE'];
    if (!validCategories.includes(failureData.category.toUpperCase())) {
      violations.push('Invalid failure category');
    }

    // Generate failure code
    const generatedCode = this.generateFailureCode(failureData.category, failureData.subcategory, failureData.cause);

    return {
      isValid: violations.length === 0,
      violations,
      generatedCode
    };
  }

  /**
   * Validate parts classification
   */
  async validatePartsClassification(partData: {
    partNumber: string;
    description: string;
    isCritical?: boolean;
    sourceType?: string;
    leadTimeDays?: number;
  }): Promise<{
    isValid: boolean;
    violations: string[];
    classification?: PartsClassification;
  }> {
    const violations: string[] = [];

    // Validate part number format
    if (!partData.partNumber || partData.partNumber.length < 5) {
      violations.push('Part number must be at least 5 characters');
    }

    // Validate source type
    if (partData.sourceType && !['imported', 'local', 'both'].includes(partData.sourceType)) {
      violations.push('Source type must be imported, local, or both');
    }

    // Validate lead time
    if (partData.leadTimeDays !== undefined && partData.leadTimeDays < 0) {
      violations.push('Lead time cannot be negative');
    }

    // Auto-classify based on description keywords
    const classification = await this.autoClassifyPart(partData);

    return {
      isValid: violations.length === 0,
      violations,
      classification
    };
  }

  /**
   * Validate technician skill authorization
   */
  async validateTechnicianSkill(skillData: {
    userId: number;
    skillCode: string;
    skillLevel: number;
    jobType: string;
  }): Promise<{
    isAuthorized: boolean;
    violations: string[];
    requiredLevel?: number;
  }> {
    const violations: string[] = [];

    try {
      // Get skill requirements for job type
      const response = await api.get(`/master-data/job-skill-requirements/${skillData.jobType}`);
      const requirements = response.data.data;

      const requiredSkill = requirements.find((req: any) => req.skill_code === skillData.skillCode);
      
      if (!requiredSkill) {
        violations.push(`Skill ${skillData.skillCode} not required for job type ${skillData.jobType}`);
        return { isAuthorized: false, violations };
      }

      if (skillData.skillLevel < requiredSkill.minimum_level) {
        violations.push(`Minimum skill level ${requiredSkill.minimum_level} required, current level: ${skillData.skillLevel}`);
      }

      // Check certification validity
      const certResponse = await api.get(`/users/${skillData.userId}/certifications/${skillData.skillCode}`);
      const certification = certResponse.data.data;

      if (certification && certification.expiry_date) {
        const expiryDate = new Date(certification.expiry_date);
        if (expiryDate < new Date()) {
          violations.push('Certification has expired');
        }
      }

      return {
        isAuthorized: violations.length === 0,
        violations,
        requiredLevel: requiredSkill.minimum_level
      };
    } catch (error) {
      violations.push('Unable to validate skill requirements');
      return { isAuthorized: false, violations };
    }
  }

  /**
   * Enforce master data governance
   */
  async enforceGovernance(entityType: string, entityData: any, userId: number): Promise<{
    allowed: boolean;
    violations: string[];
    correctedData?: any;
  }> {
    let violations: string[] = [];
    let correctedData = { ...entityData };

    switch (entityType) {
      case 'asset':
        const assetValidation = await this.validateAssetNaming(entityData);
        violations = assetValidation.violations;
        if (assetValidation.suggestedCode) {
          correctedData.code = assetValidation.suggestedCode;
        }
        break;

      case 'failure_code':
        const failureValidation = await this.validateFailureCode(entityData);
        violations = failureValidation.violations;
        if (failureValidation.generatedCode) {
          correctedData.code = failureValidation.generatedCode;
        }
        break;

      case 'part':
        const partValidation = await this.validatePartsClassification(entityData);
        violations = partValidation.violations;
        if (partValidation.classification) {
          correctedData = { ...correctedData, ...partValidation.classification };
        }
        break;

      default:
        violations.push('Unknown entity type for governance');
    }

    // Log governance enforcement
    await AuditService.logEnforcement(
      'master_data_governance',
      `${entityType}_${entityData.id || 'new'}`,
      userId,
      violations.length === 0 ? 'GOVERNANCE_PASSED' : 'GOVERNANCE_VIOLATED',
      {
        entity_type: entityType,
        violations,
        corrected_data: correctedData
      }
    );

    return {
      allowed: violations.length === 0,
      violations,
      correctedData: violations.length === 0 ? undefined : correctedData
    };
  }

  /**
   * Generate asset code following naming standard
   */
  private async generateAssetCode(plant: string, area: string, line: string, machineName: string): Promise<string> {
    const plantCode = plant.substring(0, 3).toUpperCase();
    const areaCode = area.substring(0, 3).toUpperCase();
    const lineCode = line.substring(0, 3).toUpperCase();
    const machineCode = machineName.replace(/[^A-Z0-9]/g, '').substring(0, 4);

    let counter = 1;
    let proposedCode = `${plantCode}-${areaCode}-${lineCode}-${machineCode}`;

    // Ensure uniqueness
    while (true) {
      try {
        const response = await api.get(`/master-data/assets/validate-code/${proposedCode}`);
        if (response.data.data.isUnique) break;
        proposedCode = `${plantCode}-${areaCode}-${lineCode}-${machineCode}${counter.toString().padStart(2, '0')}`;
        counter++;
      } catch {
        break;
      }
    }

    return proposedCode;
  }

  /**
   * Generate failure code
   */
  private generateFailureCode(category: string, subcategory: string, cause: string): string {
    const categoryCode = category.substring(0, 4).toUpperCase();
    const subcategoryCode = subcategory.replace(/[^A-Z0-9]/g, '').substring(0, 3);
    const causeCode = cause.replace(/[^A-Z0-9]/g, '').substring(0, 3);
    
    return `${categoryCode}-${subcategoryCode}-${causeCode}`;
  }

  /**
   * Auto-classify part based on description
   */
  private async autoClassifyPart(partData: any): Promise<PartsClassification> {
    const description = partData.description.toLowerCase();
    
    // Critical part keywords
    const criticalKeywords = ['bearing', 'motor', 'pump', 'valve', 'sensor', 'controller'];
    const isCritical = criticalKeywords.some(keyword => description.includes(keyword));

    // Source type detection
    const importedKeywords = ['siemens', 'abb', 'schneider', 'allen bradley'];
    const localKeywords = ['ghana', 'local', 'tema'];
    
    let sourceType: 'imported' | 'local' | 'both' = 'local';
    if (importedKeywords.some(keyword => description.includes(keyword))) {
      sourceType = 'imported';
    } else if (localKeywords.some(keyword => description.includes(keyword))) {
      sourceType = 'local';
    }

    // Lead time estimation
    const leadTimeDays = sourceType === 'imported' ? 30 : 7;

    return {
      partId: partData.id || 0,
      isCritical,
      sourceType,
      leadTimeDays,
      category: this.categorizePartByDescription(description)
    };
  }

  /**
   * Categorize part by description
   */
  private categorizePartByDescription(description: string): string {
    if (description.includes('bearing') || description.includes('seal')) return 'MECHANICAL';
    if (description.includes('motor') || description.includes('cable')) return 'ELECTRICAL';
    if (description.includes('sensor') || description.includes('transmitter')) return 'INSTRUMENTATION';
    if (description.includes('oil') || description.includes('grease')) return 'LUBRICANTS';
    return 'GENERAL';
  }
}

export default new MasterDataGovernanceService();