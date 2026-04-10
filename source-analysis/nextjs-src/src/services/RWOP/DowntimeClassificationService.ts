import api from '@/lib/api';
import AuditService from './AuditService';

export enum DowntimeCategory {
  MECHANICAL = 'mechanical',
  ELECTRICAL = 'electrical',
  INSTRUMENTATION = 'instrumentation',
  POWER = 'power',
  OPERATIONS = 'operations',
  MATERIALS = 'materials',
  PLANNED_MAINTENANCE = 'planned_maintenance'
}

export interface DowntimeReason {
  id: number;
  category: DowntimeCategory;
  code: string;
  description: string;
  subcategory?: string;
  isActive: boolean;
}

export interface DowntimeRecord {
  id: number;
  workOrderId: number;
  assetId: number;
  reasonId: number;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  productionLossGHS?: number;
  recordedBy: number;
}

export class DowntimeClassificationService {
  
  private standardReasons: Omit<DowntimeReason, 'id'>[] = [
    // Mechanical
    { category: DowntimeCategory.MECHANICAL, code: 'MECH-001', description: 'Bearing failure', subcategory: 'Rotating Equipment', isActive: true },
    { category: DowntimeCategory.MECHANICAL, code: 'MECH-002', description: 'Belt/Chain failure', subcategory: 'Drive Systems', isActive: true },
    { category: DowntimeCategory.MECHANICAL, code: 'MECH-003', description: 'Seal/Gasket leak', subcategory: 'Sealing Systems', isActive: true },
    { category: DowntimeCategory.MECHANICAL, code: 'MECH-004', description: 'Coupling failure', subcategory: 'Drive Systems', isActive: true },
    
    // Electrical
    { category: DowntimeCategory.ELECTRICAL, code: 'ELEC-001', description: 'Motor failure', subcategory: 'Motors', isActive: true },
    { category: DowntimeCategory.ELECTRICAL, code: 'ELEC-002', description: 'Control circuit fault', subcategory: 'Controls', isActive: true },
    { category: DowntimeCategory.ELECTRICAL, code: 'ELEC-003', description: 'Wiring/Connection issue', subcategory: 'Wiring', isActive: true },
    
    // Instrumentation
    { category: DowntimeCategory.INSTRUMENTATION, code: 'INST-001', description: 'Sensor malfunction', subcategory: 'Sensors', isActive: true },
    { category: DowntimeCategory.INSTRUMENTATION, code: 'INST-002', description: 'Control valve failure', subcategory: 'Valves', isActive: true },
    
    // Power
    { category: DowntimeCategory.POWER, code: 'PWR-001', description: 'Grid power outage', subcategory: 'External Power', isActive: true },
    { category: DowntimeCategory.POWER, code: 'PWR-002', description: 'Generator failure', subcategory: 'Backup Power', isActive: true },
    { category: DowntimeCategory.POWER, code: 'PWR-003', description: 'Voltage fluctuation', subcategory: 'Power Quality', isActive: true },
    
    // Operations
    { category: DowntimeCategory.OPERATIONS, code: 'OPS-001', description: 'Operator error', subcategory: 'Human Error', isActive: true },
    { category: DowntimeCategory.OPERATIONS, code: 'OPS-002', description: 'Process adjustment', subcategory: 'Process Control', isActive: true },
    { category: DowntimeCategory.OPERATIONS, code: 'OPS-003', description: 'Shift changeover', subcategory: 'Shift Operations', isActive: true },
    
    // Materials
    { category: DowntimeCategory.MATERIALS, code: 'MAT-001', description: 'Raw material shortage', subcategory: 'Supply Chain', isActive: true },
    { category: DowntimeCategory.MATERIALS, code: 'MAT-002', description: 'Quality rejection', subcategory: 'Quality Control', isActive: true },
    
    // Planned Maintenance
    { category: DowntimeCategory.PLANNED_MAINTENANCE, code: 'PM-001', description: 'Scheduled maintenance', subcategory: 'Preventive', isActive: true },
    { category: DowntimeCategory.PLANNED_MAINTENANCE, code: 'PM-002', description: 'Inspection', subcategory: 'Condition Monitoring', isActive: true }
  ];

  /**
   * Record downtime with classification
   */
  async recordDowntime(
    workOrderId: number | string,
    assetId: number,
    reasonId: number,
    startTime: string,
    endTime: string | null,
    productionLossGHS: number | null,
    userId: number
  ): Promise<DowntimeRecord> {
    const durationMinutes = endTime 
      ? Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60))
      : null;

    try {
      const response = await api.post('/downtime-records', {
        work_order_id: workOrderId,
        asset_id: assetId,
        reason_id: reasonId,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        production_loss_ghs: productionLossGHS,
        recorded_by: userId
      });

      // Log downtime recording
      await AuditService.logEnforcement(
        'downtime_record',
        response.data.data.id,
        userId,
        'DOWNTIME_RECORDED',
        {
          work_order_id: workOrderId,
          asset_id: assetId,
          reason_id: reasonId,
          duration_minutes: durationMinutes,
          production_loss_ghs: productionLossGHS
        }
      );

      return response.data.data;
    } catch (error) {
      await AuditService.logEnforcement(
        'downtime_record',
        `${workOrderId}_${assetId}`,
        userId,
        'DOWNTIME_RECORD_FAILED',
        {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      throw error;
    }
  }

  /**
   * Get downtime reasons by category
   */
  async getDowntimeReasons(category?: DowntimeCategory): Promise<DowntimeReason[]> {
    const params = category ? { category } : {};
    const response = await api.get('/downtime-reasons', { params });
    return response.data.data || [];
  }

  /**
   * Get downtime analysis for asset
   */
  async getAssetDowntimeAnalysis(assetId: number, dateFrom: string, dateTo: string): Promise<{
    totalDowntimeMinutes: number;
    downtimeByCategory: Array<{
      category: DowntimeCategory;
      totalMinutes: number;
      occurrences: number;
      avgDurationMinutes: number;
      productionLossGHS: number;
    }>;
    topReasons: Array<{
      reasonId: number;
      description: string;
      totalMinutes: number;
      occurrences: number;
    }>;
  }> {
    const response = await api.get(`/assets/${assetId}/downtime-analysis`, {
      params: { date_from: dateFrom, date_to: dateTo }
    });
    return response.data.data;
  }

  /**
   * Calculate downtime KPIs
   */
  async calculateDowntimeKPIs(filters: {
    assetId?: number;
    departmentId?: number;
    dateFrom: string;
    dateTo: string;
  }): Promise<{
    totalDowntimeHours: number;
    mtbf: number; // Mean Time Between Failures
    mttr: number; // Mean Time To Repair
    availability: number;
    productionLossGHS: number;
    downtimeFrequency: number;
  }> {
    const response = await api.get('/downtime-kpis', { params: filters });
    return response.data.data;
  }

  /**
   * Initialize standard downtime reasons
   */
  async initializeStandardReasons(): Promise<void> {
    try {
      await api.post('/downtime-reasons/initialize', {
        reasons: this.standardReasons
      });
    } catch (error) {
      console.error('Failed to initialize standard downtime reasons:', error);
    }
  }

  /**
   * Link downtime to work order
   */
  async linkDowntimeToWorkOrder(
    downtimeRecordId: number,
    workOrderId: number | string,
    userId: number
  ): Promise<void> {
    try {
      await api.post(`/downtime-records/${downtimeRecordId}/link-work-order`, {
        work_order_id: workOrderId,
        linked_by: userId
      });

      await AuditService.logEnforcement(
        'downtime_record',
        downtimeRecordId,
        userId,
        'DOWNTIME_LINKED_TO_WO',
        {
          work_order_id: workOrderId,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      throw error;
    }
  }
}

export default new DowntimeClassificationService();