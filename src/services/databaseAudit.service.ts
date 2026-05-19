// ============================================================================
// DATABASE AUDIT SERVICE — Index analysis, storage stats, optimization reports
// ============================================================================

import { db } from '@/lib/db';
import { createLogger } from '@/lib/logger';

const logger = createLogger('DatabaseAudit');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IndexInfo {
  table: string;
  field: string;
  type: 'PRIMARY' | 'UNIQUE' | 'INDEX';
  isComposite: boolean;
}

interface IndexRecommendation {
  table: string;
  field: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  type: 'missing_index' | 'composite_suggestion' | 'already_covered';
}

interface IndexAuditResult {
  timestamp: string;
  totalModels: number;
  currentIndexes: IndexInfo[];
  recommendations: IndexRecommendation[];
  fkFieldsVerified: { table: string; field: string; hasIndex: boolean }[];
  summary: {
    totalExplicitIndexes: number;
    totalAutoFkIndexes: number;
    missingRecommendations: number;
    coveredFields: number;
  };
}

interface TableStorageInfo {
  table: string;
  recordCount: number;
  estimatedSizeBytes: number;
  estimatedSizeReadable: string;
  avgRowSizeBytes: number;
  growthIndicator: 'low' | 'medium' | 'high' | 'unknown';
  hasTimestamp: boolean;
}

interface StorageStatsResult {
  timestamp: string;
  tables: TableStorageInfo[];
  totalEstimatedBytes: number;
  totalEstimatedReadable: string;
  largestTables: TableStorageInfo[];
  highGrowthTables: string[];
}

interface ArchivalCandidate {
  table: string;
  tableName: string;
  retentionDays: number;
  cutoffDate: Date;
  currentCount: number;
  expiredCount: number;
  estimatedSavingsBytes: number;
  estimatedSavingsReadable: string;
  riskLevel: 'low' | 'medium' | 'high';
  notes: string;
}

interface QueryOptimizationReport {
  timestamp: string;
  connectionPool: {
    recommendedMin: number;
    recommendedMax: number;
    currentEstimate: string;
    notes: string;
  };
  selectOptimization: {
    entity: string;
    recommendation: string;
    impact: string;
  }[];
  nplusOnePatterns: {
    pattern: string;
    description: string;
    mitigation: string;
  }[];
  batchRecommendations: {
    operation: string;
    recommendation: string;
    estimatedImprovement: string;
  }[];
}

// ---------------------------------------------------------------------------
// Schema metadata — derived from reading the Prisma schema
// ---------------------------------------------------------------------------

/** Maps model name → DB table name */
const MODEL_TABLE_MAP: Record<string, string> = {
  Role: 'roles',
  Permission: 'permissions',
  RolePermission: 'role_permissions',
  User: 'users',
  UserRole: 'user_roles',
  UserPermission: 'user_permissions',
  SystemModule: 'system_modules',
  CompanyModule: 'company_modules',
  Plant: 'plants',
  Department: 'departments',
  UserPlant: 'user_plants',
  MaintenanceRequest: 'maintenance_requests',
  WorkOrder: 'work_orders',
  WorkOrderTeamMember: 'wo_team_members',
  WorkOrderTimeLog: 'wo_time_logs',
  WorkOrderMaterial: 'wo_materials',
  WorkOrderComment: 'wo_comments',
  StatusTransition: 'status_transitions',
  AuditLog: 'audit_logs',
  EscalationLog: 'escalation_logs',
  CompanyProfile: 'company_profile',
  Notification: 'notifications',
  AssetCategory: 'asset_categories',
  Asset: 'assets',
  InventoryItem: 'inventory_items',
  StockMovement: 'stock_movements',
  PmSchedule: 'pm_schedules',
  PmTemplate: 'pm_templates',
  PmTemplateTask: 'pm_template_tasks',
  PmTrigger: 'pm_triggers',
  WorkOrderStatusHistory: 'wo_status_history',
  MaintenanceRequestComment: 'mr_comments',
  Trade: 'trades',
  UserSkill: 'user_skills',
  IotDevice: 'iot_devices',
  IotReading: 'iot_readings',
  IotAlert: 'iot_alerts',
  IotAlertRule: 'iot_alert_rules',
  Tool: 'tools',
  ToolTransaction: 'tool_transactions',
  InventoryLocation: 'inventory_locations',
  InventoryAdjustment: 'inventory_adjustments',
  InventoryRequest: 'inventory_requests',
  InventoryRequestItem: 'inventory_request_items',
  InventoryTransfer: 'inventory_transfers',
  Supplier: 'suppliers',
  PurchaseOrder: 'purchase_orders',
  PurchaseOrderItem: 'purchase_order_items',
  ReceivingRecord: 'receiving_records',
  SafetyIncident: 'safety_incidents',
  SafetyInspection: 'safety_inspections',
  SafetyTraining: 'safety_training',
  SafetyEquipment: 'safety_equipment',
  SafetyPermit: 'safety_permits',
  QualityInspection: 'quality_inspections',
  NonConformanceReport: 'non_conformance_reports',
  QualityAudit: 'quality_audits',
  QualityControlPlan: 'quality_control_plans',
  CorrectiveAction: 'corrective_actions',
  WorkCenter: 'work_centers',
  ProductionOrder: 'production_orders',
  ProductionBatch: 'production_batches',
  MeterReading: 'meter_readings',
  TrainingCourse: 'training_courses',
  ShiftHandover: 'shift_handovers',
  Checklist: 'checklists',
  ChecklistItem: 'checklist_items',
  ChecklistResponse: 'checklist_responses',
  Survey: 'surveys',
  CalibrationRecord: 'calibration_records',
  RiskAssessment: 'risk_assessments',
  LotoRecord: 'loto_records',
  BillOfMaterial: 'bill_of_materials',
  DigitalTwin: 'digital_twins',
  AssetModel: 'asset_models',
  AssetMeshBinding: 'asset_mesh_bindings',
  DigitalTwinScene: 'digital_twin_scenes',
  TwinHotspot: 'twin_hotspots',
  TwinCameraPreset: 'twin_camera_presets',
  TwinAnnotation: 'twin_annotations',
  SystemDiagram: 'system_diagrams',
  Conversation: 'conversations',
  ConversationParticipant: 'conversation_participants',
  Session: 'sessions',
  ChatMessage: 'chat_messages',
  RepairMaterialRequest: 'repair_material_requests',
  RepairToolRequest: 'repair_tool_requests',
  ToolTransferRequest: 'tool_transfer_requests',
  WorkOrderDowntime: 'wo_downtimes',
  RepairCompletion: 'repair_completions',
  Attachment: 'attachments',
  ComponentRegistry: 'component_registry',
  ComponentSparePart: 'component_spare_parts',
  ComponentToolRequirement: 'component_tool_requirements',
  FailureRecord: 'failure_records',
  ModelVersion: 'model_versions',
  TwinAuditLog: 'twin_audit_logs',
  PredictiveModel: 'predictive_models',
  PredictionAlert: 'prediction_alerts',
  ComponentRuntimeCounter: 'component_runtime_counters',
  ComponentConditionReading: 'component_condition_readings',
  ComponentMaintenanceHistory: 'component_maintenance_history',
  ComponentInspectionPoint: 'component_inspection_points',
  ComponentInspectionRecord: 'component_inspection_records',
  ComponentLubricationSchedule: 'component_lubrication_schedules',
  ComponentLubricationRecord: 'component_lubrication_records',
  ComponentReplacementHistory: 'component_replacement_history',
  SpatialNode: 'spatial_nodes',
  WorkInstruction: 'work_instructions',
  WorkInstructionExecution: 'work_instruction_executions',
  ModelLibrary: 'model_library',
  MeshComponentMapping: 'mesh_component_mappings',
  InspectionTour: 'inspection_tours',
  ModelProcessingJob: 'model_processing_jobs',
  AssetViewBookmark: 'asset_view_bookmarks',
  BomRevision: 'bom_revisions',
  BomRevisionItem: 'bom_revision_items',
  AlternatePart: 'alternate_parts',
  EngineeringChangeRequest: 'engineering_change_requests',
  CriticalSpareAnalysis: 'critical_spare_analysis',
  TelemetryDataSource: 'telemetry_data_sources',
  TelemetryMapping: 'telemetry_mappings',
  TelemetryStream: 'telemetry_streams',
  TelemetryAggregation: 'telemetry_aggregations',
  AlarmRule: 'alarm_rules',
  AlarmEvent: 'alarm_events',
  FailureMode: 'failure_modes',
  RcmAnalysis: 'rcm_analyses',
  WeibullAnalysis: 'weibull_analyses',
  DowntimeAnalysis: 'downtime_analyses',
  RemainingUsefulLife: 'remaining_useful_life',
  TelemetryReading: 'telemetry_readings',
  EdgeGateway: 'edge_gateways',
  ConnectivitySession: 'connectivity_sessions',
  TelemetryBatch: 'telemetry_batches',
  EventStreamRecord: 'event_stream_records',
  DownsamplingPolicy: 'downsampling_policies',
  DownsampledReading: 'downsampled_readings',
  RetentionPolicy: 'retention_policies',
  AnomalyDetectionConfig: 'anomaly_detection_configs',
  AnomalyRecord: 'anomaly_records',
  DataQualityReport: 'data_quality_reports',
  RbiAssessment: 'rbi_assessments',
  SilAssessment: 'sil_assessments',
  DegradationProfile: 'degradation_profiles',
  LifecycleForecast: 'lifecycle_forecasts',
  SpareOptimization: 'spare_optimizations',
  WorkflowDefinition: 'workflow_definitions',
  WorkflowInstance: 'workflow_instances',
  WorkflowStepHistory: 'workflow_step_history',
  SlaPolicy: 'sla_policies',
  SlaTracking: 'sla_tracking',
  BusinessCalendar: 'business_calendars',
  StoEvent: 'sto_events',
  StoTask: 'sto_tasks',
  StoContractor: 'sto_contractors',
  StoContractorAssignment: 'sto_contractor_assignments',
  StoProgressReport: 'sto_progress_reports',
  InspectionTemplate: 'inspection_templates',
  MobileInspection: 'mobile_inspections',
  GeofenceZone: 'geofence_zones',
  GeofenceEvent: 'geofence_events',
  SyncOperation: 'sync_operations',
  EngineeringDocument: 'engineering_documents',
  DocumentRevision: 'document_revisions',
  PidTagLink: 'pid_tag_links',
  DocumentSearchLog: 'document_search_logs',
  DomainEvent: 'domain_events',
};

/** Known explicit @@index from schema — format: model → [[fields]] */
const EXPLICIT_INDEXES: Record<string, string[][]> = {
  MaintenanceRequest: [['plantId'], ['status'], ['priority'], ['departmentId'], ['createdAt']],
  WorkOrder: [['plantId'], ['status'], ['priority'], ['assignedTo'], ['assetId'], ['createdAt']],
  Asset: [['plantId'], ['status'], ['categoryId'], ['criticality']],
  DigitalTwin: [['assetId'], ['createdById'], ['isActive']],
  AssetModel: [['assetId'], ['uploadedById']],
  AssetMeshBinding: [['modelId'], ['assetId']],
  DigitalTwinScene: [['twinId'], ['modelId'], ['createdById'], ['modelFileId']],
  TwinHotspot: [['sceneId'], ['assetId'], ['bindingId']],
  TwinCameraPreset: [['sceneId']],
  TwinAnnotation: [['sceneId'], ['authorId'], ['assetId']],
  SystemDiagram: [['plantId'], ['createdById'], ['type']],
  ComponentRegistry: [['parentId'], ['assetId'], ['twinId'], ['componentType'], ['criticality'], ['lifecycleStatus']],
  ComponentSparePart: [['componentId'], ['inventoryItemId']],
  ComponentToolRequirement: [['componentId'], ['toolId']],
  FailureRecord: [['componentId'], ['assetId'], ['failureMode'], ['failureModeId'], ['failureSeverity'], ['detectedAt']],
  ModelVersion: [['assetModelId'], ['modelLibraryId']],
  TwinAuditLog: [['entityType', 'entityId'], ['userId'], ['createdAt'], ['action']],
  PredictiveModel: [['componentId'], ['assetId'], ['trainingStatus'], ['createdById']],
  PredictionAlert: [['predictiveModelId'], ['componentId'], ['assetId'], ['severity'], ['isAcknowledged'], ['createdAt']],
  ComponentRuntimeCounter: [['componentId'], ['counterType']],
  ComponentConditionReading: [['componentId', 'parameterKey'], ['componentId', 'recordedAt'], ['parameterKey'], ['isAlarm']],
  ComponentMaintenanceHistory: [['componentId'], ['workOrderId'], ['maintenanceType'], ['performedById'], ['completedAt']],
  ComponentInspectionPoint: [['componentId'], ['isActive']],
  ComponentInspectionRecord: [['inspectionPointId'], ['componentId'], ['inspectorId'], ['inspectedAt']],
  ComponentLubricationSchedule: [['componentId'], ['nextDueDate']],
  ComponentLubricationRecord: [['scheduleId'], ['componentId'], ['performedAt']],
  ComponentReplacementHistory: [['componentId'], ['replacedAt']],
  SpatialNode: [['parentId'], ['nodeType'], ['level']],
  WorkInstruction: [['componentId'], ['assetId'], ['maintenanceType'], ['isActive']],
  WorkInstructionExecution: [['workInstructionId'], ['technicianId'], ['workOrderId'], ['status']],
  ModelLibrary: [['assetId'], ['plantId'], ['uploadedById'], ['status'], ['format']],
  MeshComponentMapping: [['modelId'], ['meshName'], ['mappingType'], ['targetId']],
  InspectionTour: [['twinId'], ['isPublished']],
  ModelProcessingJob: [['modelId'], ['status'], ['jobType']],
  AssetViewBookmark: [['sceneId'], ['createdById']],
  BomRevision: [['bomId'], ['status'], ['isActive']],
  BomRevisionItem: [['revisionId'], ['parentItemId'], ['componentId'], ['inventoryItemId']],
  AlternatePart: [['primaryPartId'], ['alternatePartId']],
  EngineeringChangeRequest: [['status'], ['bomId'], ['assetId'], ['plantId'], ['requestedById']],
  CriticalSpareAnalysis: [['criticalityScore'], ['leadTimeRisk']],
  TelemetryDataSource: [['sourceType'], ['status'], ['plantId']],
  TelemetryMapping: [['sourceId'], ['deviceId'], ['parameterName']],
  TelemetryStream: [['mappingId'], ['sourceId'], ['timestamp'], ['sourceId', 'timestamp'], ['isAnomaly']],
  TelemetryAggregation: [['mappingId'], ['periodType'], ['periodStart']],
  AlarmRule: [['mappingId'], ['severity'], ['isActive']],
  AlarmEvent: [['ruleId'], ['mappingId'], ['status'], ['severity'], ['createdAt']],
  FailureMode: [['category'], ['severity']],
  RcmAnalysis: [['assetId'], ['status']],
  WeibullAnalysis: [['componentId']],
  DowntimeAnalysis: [['assetId'], ['periodStart']],
  RemainingUsefulLife: [['estimatedRul']],
  TelemetryReading: [['sourceId'], ['timestamp'], ['sourceId', 'timestamp']],
  EdgeGateway: [['status'], ['plantId']],
  ConnectivitySession: [['sourceId'], ['status'], ['gatewayId']],
  TelemetryBatch: [['sourceId'], ['status'], ['gatewayId']],
  EventStreamRecord: [['eventType'], ['sourceId'], ['severity'], ['timestamp']],
  DownsampledReading: [['sourceId', 'interval', 'bucketStart'], ['sourceId', 'interval']],
  AnomalyRecord: [['sourceId', 'detectedAt'], ['severity'], ['confirmed']],
  DataQualityReport: [['sourceId', 'periodStart']],
  RbiAssessment: [['assetId'], ['riskCategory'], ['status']],
  SilAssessment: [['assetId'], ['silTarget'], ['status']],
  DegradationProfile: [['assetId', 'parameterName'], ['degradationStage']],
  LifecycleForecast: [['assetId']],
  SpareOptimization: [['inventoryItemId'], ['abcClassification']],
  WorkflowDefinition: [['key'], ['category'], ['isActive']],
  WorkflowInstance: [['entityType', 'entityId'], ['status'], ['definitionId']],
  WorkflowStepHistory: [['instanceId'], ['stepId']],
  SlaTracking: [['policyId'], ['status']],
  StoEvent: [['plantId'], ['status'], ['plannedStartDate']],
  StoTask: [['eventId'], ['isOnCriticalPath'], ['status']],
  StoContractorAssignment: [['contractorId'], ['eventId']],
  StoProgressReport: [['eventId', 'reportDate']],
  InspectionTemplate: [['templateId'], ['assetId'], ['inspectorId'], ['status']],
  GeofenceZone: [['plantId']],
  GeofenceEvent: [['zoneId', 'timestamp'], ['userId']],
  SyncOperation: [['userId', 'status'], ['status']],
  EngineeringDocument: [['category'], ['plantId'], ['status'], ['discipline'], ['documentNumber']],
  DocumentRevision: [['documentId', 'version']],
  PidTagLink: [['documentId'], ['tagNumber'], ['assetId']],
  DocumentSearchLog: [['query'], ['createdAt']],
  DomainEvent: [['eventType'], ['correlationId'], ['status'], ['createdAt'], ['entityName', 'entityId']],
};

/** Known foreign-key fields — model → FK fields */
const FK_FIELDS: Record<string, string[]> = {
  RolePermission: ['roleId', 'permissionId'],
  UserRole: ['userId', 'roleId'],
  UserPermission: ['userId', 'permissionId'],
  CompanyModule: ['systemModuleId'],
  Department: ['plantId', 'parentId', 'supervisorId'],
  UserPlant: ['userId', 'plantId'],
  MaintenanceRequest: ['assetId', 'requestedBy', 'supervisorId', 'approvedBy', 'assignedPlannerId'],
  WorkOrder: ['maintenanceRequestId', 'pmScheduleId', 'assetId', 'assignedTo', 'teamLeaderId', 'assignedSupervisorId', 'assignedBy', 'plannerId', 'lockedBy'],
  WorkOrderTeamMember: ['workOrderId', 'userId'],
  WorkOrderTimeLog: ['workOrderId', 'userId'],
  WorkOrderMaterial: ['workOrderId', 'requestedBy', 'approvedBy', 'issuedBy'],
  WorkOrderComment: ['workOrderId', 'userId'],
  AuditLog: ['userId'],
  Notification: ['userId'],
  Asset: ['categoryId', 'plantId', 'departmentId', 'createdById', 'assignedToId', 'parentId'],
  InventoryItem: ['plantId', 'createdById', 'locationId', 'supplierId'],
  StockMovement: ['itemId', 'performedById'],
  PmSchedule: ['assetId', 'assignedToId', 'departmentId', 'createdById', 'templateId'],
  PmTemplate: ['createdById'],
  PmTemplateTask: ['templateId'],
  PmTrigger: ['scheduleId'],
  WorkOrderStatusHistory: ['workOrderId', 'userId'],
  MaintenanceRequestComment: ['requestId', 'userId'],
  UserSkill: ['userId', 'tradeId'],
  IotReading: ['deviceId'],
  IotAlert: ['deviceId', 'ruleId'],
  IotAlertRule: ['deviceId', 'createdById'],
  Tool: ['assignedToId', 'createdById'],
  ToolTransaction: ['toolId', 'performedById'],
  InventoryAdjustment: ['inventoryItemId', 'approvedById', 'createdById'],
  InventoryRequest: ['requestedById', 'approvedById'],
  InventoryRequestItem: ['requestId', 'inventoryItemId'],
  InventoryTransfer: ['requestedById', 'approvedById'],
  PurchaseOrderItem: ['purchaseOrderId', 'inventoryItemId'],
  ReceivingRecord: ['purchaseOrderId', 'performedById'],
  Session: ['userId'],
  ChatMessage: ['convoId', 'senderId'],
  ConversationParticipant: ['conversationId', 'userId'],
  RepairMaterialRequest: ['workOrderId', 'itemId'],
  RepairToolRequest: ['workOrderId', 'toolId'],
  ToolTransferRequest: ['toolId', 'requestedById', 'fromUserId', 'toUserId', 'storekeeperApprovedById'],
  WorkOrderDowntime: ['workOrderId'],
  RepairCompletion: ['workOrderId'],
  Attachment: ['createdById'],
  ComponentSparePart: ['componentId', 'inventoryItemId'],
  ComponentToolRequirement: ['componentId', 'toolId'],
  FailureRecord: ['componentId', 'assetId', 'failureModeId', 'reportedById', 'workOrderId'],
  ModelVersion: ['assetModelId', 'modelLibraryId', 'uploadedById'],
  TwinAuditLog: ['userId'],
  PredictiveModel: ['componentId', 'assetId', 'createdById'],
  PredictionAlert: ['predictiveModelId', 'componentId', 'assetId', 'acknowledgedById'],
  ComponentRuntimeCounter: ['componentId'],
  ComponentConditionReading: ['componentId', 'recordedById'],
  ComponentMaintenanceHistory: ['componentId', 'workOrderId', 'performedById'],
  ComponentInspectionRecord: ['inspectionPointId', 'componentId', 'inspectorId'],
  ComponentLubricationRecord: ['scheduleId', 'componentId', 'performedById'],
  ComponentReplacementHistory: ['componentId', 'performedById'],
  SpatialNode: ['parentId', 'assetId', 'createdById'],
  WorkInstruction: ['componentId', 'assetId', 'createdById'],
  WorkInstructionExecution: ['workInstructionId', 'technicianId', 'workOrderId'],
  ModelLibrary: ['uploadedById', 'plantId', 'assetId'],
  MeshComponentMapping: ['modelId', 'createdById'],
  InspectionTour: ['twinId', 'createdById'],
  ModelProcessingJob: ['modelId', 'queuedById'],
  AssetViewBookmark: ['sceneId', 'createdById'],
  BomRevision: ['bomId', 'approvedById', 'createdById'],
  BomRevisionItem: ['revisionId', 'componentId', 'inventoryItemId'],
  AlternatePart: ['primaryPartId', 'alternatePartId', 'approvedById', 'createdById'],
  EngineeringChangeRequest: ['bomId', 'assetId', 'plantId', 'requestedById', 'reviewedById', 'approvedById', 'createdById'],
  CriticalSpareAnalysis: ['inventoryItemId', 'analyzedById'],
  TelemetryMapping: ['sourceId', 'deviceId'],
  TelemetryStream: ['mappingId', 'sourceId'],
  TelemetryAggregation: ['mappingId'],
  AlarmRule: ['mappingId', 'createdById'],
  AlarmEvent: ['ruleId', 'mappingId', 'acknowledgedById'],
  RcmAnalysis: ['assetId', 'approvedById', 'createdById'],
  DowntimeAnalysis: ['assetId', 'createdById'],
  RemainingUsefulLife: ['componentId', 'assetId', 'analyzedById'],
  TelemetryReading: ['sourceId'],
  EdgeGateway: ['plantId', 'createdById'],
  ConnectivitySession: ['sourceId', 'gatewayId'],
  TelemetryBatch: ['sourceId', 'gatewayId'],
  DownsampledReading: ['sourceId'],
  AnomalyRecord: ['mappingId', 'acknowledgedById'],
  RbiAssessment: ['assetId'],
  SilAssessment: ['assetId'],
  DegradationProfile: ['assetId'],
  LifecycleForecast: ['assetId', 'createdById'],
  SpareOptimization: ['inventoryItemId'],
  WorkflowInstance: ['definitionId'],
  WorkflowStepHistory: ['instanceId'],
  SlaTracking: ['policyId'],
  SlaPolicy: ['createdById'],
  StoEvent: ['plantId'],
  StoTask: ['eventId'],
  StoContractorAssignment: ['eventId', 'contractorId'],
  StoProgressReport: ['eventId'],
  StoContractor: ['createdById'],
  MobileInspection: ['templateId', 'assetId', 'inspectorId'],
  SyncOperation: ['userId'],
  EngineeringDocument: ['plantId', 'createdById'],
  DocumentRevision: ['documentId', 'approvedById'],
  PidTagLink: ['documentId', 'assetId'],
  RetentionPolicy: ['createdById'],
  DigitalTwin: ['assetId', 'createdById'],
  DigitalTwinScene: ['twinId', 'modelId', 'createdById', 'modelFileId'],
  AssetMeshBinding: ['modelId', 'assetId'],
  TwinHotspot: ['sceneId', 'assetId', 'bindingId'],
  TwinCameraPreset: ['sceneId'],
  TwinAnnotation: ['sceneId', 'authorId', 'assetId'],
  SystemDiagram: ['plantId', 'createdById'],
  GeofenceZone: ['plantId'],
  GeofenceEvent: ['zoneId', 'userId'],
};

/** Fields commonly queried with filters that should have indexes */
const FREQUENTLY_QUERIED_FIELDS: { model: string; field: string; reason: string }[] = [
  { model: 'MaintenanceRequest', field: 'status', reason: 'Status-filtered list views are the primary query pattern' },
  { model: 'MaintenanceRequest', field: 'plantId', reason: 'Multi-plant filtering on all list views' },
  { model: 'MaintenanceRequest', field: 'departmentId', reason: 'Department-scoped views' },
  { model: 'WorkOrder', field: 'status', reason: 'Kanban/list views filter by status' },
  { model: 'WorkOrder', field: 'plantId', reason: 'Multi-plant data isolation' },
  { model: 'WorkOrder', field: 'assignedTo', reason: 'My work orders view' },
  { model: 'WorkOrder', field: 'assetId', reason: 'Asset maintenance history lookups' },
  { model: 'Asset', field: 'status', reason: 'Asset register filtering' },
  { model: 'Asset', field: 'plantId', reason: 'Plant-scoped asset registers' },
  { model: 'Asset', field: 'criticality', reason: 'Criticality-based prioritization' },
  { model: 'Notification', field: 'userId', reason: 'User notification inbox — queried every page load' },
  { model: 'Notification', field: 'isRead', reason: 'Unread count badge queries' },
  { model: 'AuditLog', field: 'createdAt', reason: 'Time-range audit log queries' },
  { model: 'AuditLog', field: 'entityType', reason: 'Entity-specific audit log filtering' },
  { model: 'Session', field: 'expiresAt', reason: 'Session cleanup jobs scan expired sessions' },
  { model: 'TelemetryReading', field: 'timestamp', reason: 'Time-range queries for charts and alerts' },
  { model: 'EventStreamRecord', field: 'timestamp', reason: 'Time-range event stream queries' },
  { model: 'WorkflowInstance', field: 'status', reason: 'Active workflow filtering' },
  { model: 'IotReading', field: 'timestamp', reason: 'Time-range IoT data queries' },
  { model: 'StockMovement', field: 'createdAt', reason: 'Stock movement history filtering' },
  { model: 'ChatMessage', field: 'createdAt', reason: 'Chat message ordering and pagination' },
  { model: 'Attachment', field: 'createdById', reason: "User's uploaded files lookup" },
];

/** Composite indexes that could improve common multi-filter patterns */
const COMPOSITE_INDEX_SUGGESTIONS: { model: string; fields: string[]; reason: string }[] = [
  { model: 'MaintenanceRequest', fields: ['plantId', 'status'], reason: 'Plant + status is the most common list filter combination' },
  { model: 'MaintenanceRequest', fields: ['plantId', 'status', 'createdAt'], reason: 'List views with sorting by creation date' },
  { model: 'WorkOrder', fields: ['plantId', 'status'], reason: 'Plant + status is the primary WO list filter' },
  { model: 'WorkOrder', fields: ['assignedTo', 'status'], reason: '"My work orders" view with status grouping' },
  { model: 'WorkOrder', fields: ['assetId', 'createdAt'], reason: 'Asset maintenance history sorted by date' },
  { model: 'Asset', fields: ['plantId', 'status'], reason: 'Plant-scoped asset register by status' },
  { model: 'Asset', fields: ['plantId', 'criticality'], reason: 'Criticality dashboards scoped to plant' },
  { model: 'Notification', fields: ['userId', 'isRead'], reason: 'Unread count query — most frequent DB query per user' },
  { model: 'Notification', fields: ['userId', 'createdAt'], reason: 'Notification list ordered by recency' },
  { model: 'AuditLog', fields: ['entityType', 'createdAt'], reason: 'Audit log list for a specific entity type' },
  { model: 'AuditLog', fields: ['userId', 'createdAt'], reason: 'User activity audit trail' },
  { model: 'TelemetryReading', fields: ['sourceId', 'timestamp'], reason: 'Already indexed — verified present' },
  { model: 'TelemetryReading', fields: ['sourceId', 'isAnomaly'], reason: 'Anomaly filtering on time-series data' },
  { model: 'WorkflowInstance', fields: ['entityType', 'status'], reason: 'Active workflow instances for an entity type' },
  { model: 'IotReading', fields: ['deviceId', 'timestamp'], reason: 'Device readings time-range queries' },
  { model: 'Session', fields: ['userId', 'expiresAt'], reason: 'Session validity check during auth' },
];

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function fieldIsIndexed(model: string, field: string): boolean {
  const indexes = EXPLICIT_INDEXES[model] || [];
  return indexes.some(idx => idx.length === 1 && idx[0] === field);
}

function compositeExists(model: string, fields: string[]): boolean {
  const indexes = EXPLICIT_INDEXES[model] || [];
  return indexes.some(idx => {
    if (idx.length !== fields.length) return false;
    return fields.every((f, i) => idx[i] === f);
  });
}

function prefixCompositeExists(model: string, fields: string[]): boolean {
  const indexes = EXPLICIT_INDEXES[model] || [];
  return indexes.some(idx => {
    if (idx.length < fields.length) return false;
    return fields.every((f, i) => idx[i] === f);
  });
}

// ---------------------------------------------------------------------------
// Main service
// ---------------------------------------------------------------------------

class DatabaseAuditService {
  // ===================================================================
  // 1. INDEX AUDIT
  // ===================================================================

  async auditIndexes(): Promise<IndexAuditResult> {
    logger.info('Starting index audit');
    const timestamp = new Date().toISOString();

    const currentIndexes: IndexInfo[] = [];
    const recommendations: IndexRecommendation[] = [];
    const fkFieldsVerified: { table: string; field: string; hasIndex: boolean }[] = [];

    // Collect current explicit indexes
    for (const [model, fieldsList] of Object.entries(EXPLICIT_INDEXES)) {
      const tableName = MODEL_TABLE_MAP[model] || model;
      for (const fields of fieldsList) {
        currentIndexes.push({
          table: tableName,
          field: fields.join(', '),
          type: 'INDEX',
          isComposite: fields.length > 1,
        });
      }
    }

    // Verify FK fields
    for (const [model, fkFields] of Object.entries(FK_FIELDS)) {
      const tableName = MODEL_TABLE_MAP[model] || model;
      for (const field of fkFields) {
        const hasExplicit = fieldIsIndexed(model, field);
        // Prisma auto-creates indexes for FK fields, but we verify explicit coverage
        fkFieldsVerified.push({ table: tableName, field, hasIndex: hasExplicit });
        if (!hasExplicit) {
          // Check if it's covered by a composite index prefix
          const coveredByComposite = (EXPLICIT_INDEXES[model] || []).some(
            idx => idx.length > 1 && idx[0] === field
          );
          if (!coveredByComposite) {
            recommendations.push({
              table: tableName,
              field,
              reason: `Foreign key field without explicit index. Prisma auto-creates FK indexes, but an explicit @@index ensures query planner visibility and documentation.`,
              priority: 'low',
              type: 'missing_index',
            });
          }
        }
      }
    }

    // Check frequently queried fields
    for (const { model, field, reason } of FREQUENTLY_QUERIED_FIELDS) {
      const tableName = MODEL_TABLE_MAP[model] || model;
      const hasExplicit = fieldIsIndexed(model, field);
      const coveredByComposite = (EXPLICIT_INDEXES[model] || []).some(
        idx => idx.length > 1 && idx[0] === field
      );
      if (!hasExplicit && !coveredByComposite) {
        recommendations.push({
          table: tableName,
          field,
          reason,
          priority: 'high',
          type: 'missing_index',
        });
      }
    }

    // Evaluate composite index suggestions
    for (const { model, fields, reason } of COMPOSITE_INDEX_SUGGESTIONS) {
      const tableName = MODEL_TABLE_MAP[model] || model;
      if (compositeExists(model, fields)) {
        // Already present — note it's covered
        recommendations.push({
          table: tableName,
          field: fields.join(', '),
          reason: 'Composite index already present — verified.',
          priority: 'low',
          type: 'already_covered',
        });
      } else if (prefixCompositeExists(model, fields)) {
        // A wider composite exists that covers this as a prefix
        recommendations.push({
          table: tableName,
          field: fields.join(', '),
          reason: `Covered by a wider composite index prefix in ${tableName}.`,
          priority: 'low',
          type: 'already_covered',
        });
      } else {
        // Check if individual field indexes exist (partial coverage)
        const allIndividualCovered = fields.every(f => fieldIsIndexed(model, f));
        if (allIndividualCovered) {
          recommendations.push({
            table: tableName,
            field: fields.join(', '),
            reason: `Individual field indexes exist but a composite would be more efficient for multi-filter queries. ${reason}`,
            priority: 'medium',
            type: 'composite_suggestion',
          });
        } else {
          recommendations.push({
            table: tableName,
            field: fields.join(', '),
            reason,
            priority: 'high',
            type: 'composite_suggestion',
          });
        }
      }
    }

    const missingRecs = recommendations.filter(r => r.type !== 'already_covered');
    const autoFkCount = fkFieldsVerified.filter(f => !f.hasIndex).length;

    logger.info('Index audit complete', {
      totalIndexes: currentIndexes.length,
      recommendations: recommendations.length,
      missing: missingRecs.length,
    });

    return {
      timestamp,
      totalModels: Object.keys(MODEL_TABLE_MAP).length,
      currentIndexes,
      recommendations,
      fkFieldsVerified,
      summary: {
        totalExplicitIndexes: currentIndexes.length,
        totalAutoFkIndexes: autoFkCount,
        missingRecommendations: missingRecs.length,
        coveredFields: recommendations.filter(r => r.type === 'already_covered').length,
      },
    };
  }

  // ===================================================================
  // 2. QUERY OPTIMIZATION REPORT
  // ===================================================================

  async getQueryOptimizationReport(): Promise<QueryOptimizationReport> {
    logger.info('Generating query optimization report');

    return {
      timestamp: new Date().toISOString(),
      connectionPool: {
        recommendedMin: 5,
        recommendedMax: 20,
        currentEstimate: `${process.env.DATABASE_URL ? 'Configured via DATABASE_URL' : 'Default (5)'}`,
        notes: 'For a production EAM with ~150 tables and moderate concurrency, pool size of 10-20 is recommended. Use connection_limit in DATABASE_URL or pool_size in Prisma config.',
      },
      selectOptimization: [
        {
          entity: 'WorkOrder list views',
          recommendation: 'Use `select` to fetch only displayed columns (id, woNumber, title, status, priority, assignedTo). Avoid fetching specification, notes, failureDescription, causeDescription, actionDescription on list endpoints.',
          impact: 'Reduces row transfer size by ~60-70% for list queries',
        },
        {
          entity: 'Asset register',
          recommendation: 'Use `select` for register columns and defer `include: { category, plant }` to detail views or use separate lightweight queries.',
          impact: 'Asset rows are wide (~20 fields); selecting 6-8 core fields reduces payload significantly',
        },
        {
          entity: 'Dashboard stats aggregation',
          recommendation: 'Use $queryRaw for aggregation queries (COUNT, AVG, SUM) instead of fetching full records and aggregating in JavaScript.',
          impact: 'Database-side aggregation can be 10-100x faster for large tables',
        },
        {
          entity: 'Notification inbox',
          recommendation: 'Use `select` with only id, type, title, isRead, createdAt for list; fetch full message only when opened.',
          impact: 'Most queried endpoint — even small per-row savings compound heavily',
        },
        {
          entity: 'Audit log viewer',
          recommendation: 'Use pagination with cursor-based approach on createdAt; avoid OFFSET on large tables.',
          impact: 'OFFSET queries degrade linearly with table size; cursor approach is O(1)',
        },
      ],
      nplusOnePatterns: [
        {
          pattern: 'WorkOrder → materials → requester/approver/issuer',
          description: 'When listing work orders with materials, each material row triggers 3 additional user lookups.',
          mitigation: 'Use a single batched user lookup: collect all userIds from materials, then query users once with `findMany({ where: { id: { in: userIds } } })`.',
        },
        {
          pattern: 'Asset → digitalTwin → scene → hotspots',
          description: 'Deep nesting in asset detail views can trigger cascading relation loads.',
          mitigation: 'Use explicit `include` with depth control. For asset detail, include digitalTwin but load scene/hotspots in a separate request.',
        },
        {
          pattern: 'Dashboard KPI aggregation',
          description: 'Multiple independent KPI queries executed sequentially for the dashboard.',
          mitigation: 'Use Promise.all for parallel execution, or combine into a single $queryRaw with multiple CTEs.',
        },
        {
          pattern: 'Maintenance request → comments → user',
          description: 'Loading comments with user details for each comment in MR detail views.',
          mitigation: 'Use `include: { comments: { include: { user: { select: { id, fullName, avatar } } } } }` to load in a single query.',
        },
        {
          pattern: 'Component registry → spare parts → inventory item',
          description: 'Component detail view loading spare parts with inventory join.',
          mitigation: 'Use `include` at the correct level. Avoid sequential loop queries per component.',
        },
      ],
      batchRecommendations: [
        {
          operation: 'Bulk work order status update',
          recommendation: 'Use `updateMany` with `where: { id: { in: ids } }` instead of sequential `update` calls.',
          estimatedImprovement: 'N queries → 1 query (e.g., 50 updates = 50x reduction)',
        },
        {
          operation: 'Notification mark-all-read',
          recommendation: 'Use `updateMany({ where: { userId, isRead: false }, data: { isRead: true } })`.',
          estimatedImprovement: 'Single query instead of N updates per notification',
        },
        {
          operation: 'Session cleanup',
          recommendation: 'Use `deleteMany({ where: { expiresAt: { lt: now } } })` for expired session removal.',
          estimatedImprovement: 'Single query vs. find + delete loop',
        },
        {
          operation: 'Telemetry batch insert',
          recommendation: 'Use `createMany` with `skipDuplicates: true` for batch telemetry ingestion.',
          estimatedImprovement: 'Single round-trip vs. N individual inserts',
        },
        {
          operation: 'Audit log search with pagination',
          recommendation: 'Use cursor-based pagination with `where: { createdAt: { lt: cursor } }` instead of OFFSET.',
          estimatedImprovement: 'Constant-time pagination regardless of table size',
        },
      ],
    };
  }

  // ===================================================================
  // 3. ARCHIVAL CANDIDATES
  // ===================================================================

  async getArchivalCandidates(): Promise<ArchivalCandidate[]> {
    logger.info('Identifying archival candidates');
    const candidates: ArchivalCandidate[] = [];
    const now = new Date();

    // Define retention policies
    const retentionPolicies = [
      {
        table: 'iot_readings',
        tableName: 'IotReading',
        retentionDays: 30,
        riskLevel: 'low' as const,
        notes: 'Raw IoT sensor readings — high volume, can be downsampled or archived.',
        hasTimestamp: true,
        avgRowBytes: 80,
      },
      {
        table: 'telemetry_readings',
        tableName: 'TelemetryReading',
        retentionDays: 30,
        riskLevel: 'low' as const,
        notes: 'Raw telemetry readings — highest volume table in the system.',
        hasTimestamp: true,
        avgRowBytes: 80,
      },
      {
        table: 'telemetry_streams',
        tableName: 'TelemetryStream',
        retentionDays: 30,
        riskLevel: 'low' as const,
        notes: 'Raw telemetry stream records — can use downsampled_readings for historical views.',
        hasTimestamp: true,
        avgRowBytes: 100,
      },
      {
        table: 'downsampled_readings',
        tableName: 'DownsampledReading',
        retentionDays: 365,
        riskLevel: 'medium' as const,
        notes: 'Downsampled telemetry — 1min/5min aggregations. 1h+ data kept longer.',
        hasTimestamp: true,
        avgRowBytes: 100,
      },
      {
        table: 'audit_logs',
        tableName: 'AuditLog',
        retentionDays: 365,
        riskLevel: 'medium' as const,
        notes: 'Audit trail — compliance requirement. Archive rather than delete. Consider export before cleanup.',
        hasTimestamp: true,
        avgRowBytes: 500,
      },
      {
        table: 'event_stream_records',
        tableName: 'EventStreamRecord',
        retentionDays: 180,
        riskLevel: 'low' as const,
        notes: 'Connectivity event stream — informational, not critical for operations.',
        hasTimestamp: true,
        avgRowBytes: 300,
      },
      {
        table: 'notifications',
        tableName: 'Notification',
        retentionDays: 365,
        riskLevel: 'low' as const,
        notes: 'User notifications — older than 1 year are rarely accessed.',
        hasTimestamp: true,
        avgRowBytes: 300,
      },
      {
        table: 'sessions',
        tableName: 'Session',
        retentionDays: 90,
        riskLevel: 'low' as const,
        notes: 'User sessions — expired sessions should be cleaned up regularly.',
        hasTimestamp: true,
        avgRowBytes: 200,
      },
      {
        table: 'workflow_step_history',
        tableName: 'WorkflowStepHistory',
        retentionDays: 365,
        riskLevel: 'medium' as const,
        notes: 'Workflow step history — completed workflow history. Archive before cleanup for compliance.',
        hasTimestamp: true,
        avgRowBytes: 400,
      },
      {
        table: 'workflow_instances',
        tableName: 'WorkflowInstance',
        retentionDays: 365,
        riskLevel: 'medium' as const,
        notes: 'Completed workflow instances — archive with step history for audit trail.',
        hasTimestamp: true,
        avgRowBytes: 350,
      },
      {
        table: 'anomaly_records',
        tableName: 'AnomalyRecord',
        retentionDays: 365,
        riskLevel: 'low' as const,
        notes: 'Anomaly detection records — historical anomalies for ML model training.',
        hasTimestamp: true,
        avgRowBytes: 250,
      },
      {
        table: 'document_search_logs',
        tableName: 'DocumentSearchLog',
        retentionDays: 90,
        riskLevel: 'low' as const,
        notes: 'Search analytics — usage patterns for UI optimization.',
        hasTimestamp: true,
        avgRowBytes: 200,
      },
      {
        table: 'chat_messages',
        tableName: 'ChatMessage',
        retentionDays: 365,
        riskLevel: 'medium' as const,
        notes: 'Chat messages — may contain operational decisions. Archive before cleanup.',
        hasTimestamp: true,
        avgRowBytes: 500,
      },
      {
        table: 'component_condition_readings',
        tableName: 'ComponentConditionReading',
        retentionDays: 365,
        riskLevel: 'medium' as const,
        notes: 'Component condition data — used for degradation analysis and predictive maintenance.',
        hasTimestamp: true,
        avgRowBytes: 150,
      },
      {
        table: 'geofence_events',
        tableName: 'GeofenceEvent',
        retentionDays: 180,
        riskLevel: 'low' as const,
        notes: 'Geofence entry/exit events — location tracking history.',
        hasTimestamp: true,
        avgRowBytes: 200,
      },
      {
        table: 'sync_operations',
        tableName: 'SyncOperation',
        retentionDays: 90,
        riskLevel: 'low' as const,
        notes: 'Mobile sync operations — operational logging for debugging sync issues.',
        hasTimestamp: true,
        avgRowBytes: 400,
      },
    ];

    for (const policy of retentionPolicies) {
      const cutoffDate = new Date(now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1000);

      try {
        // Build a dynamic count query using $queryRaw
        const result = await db.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM ${policy.table} WHERE createdAt < ?`,
          cutoffDate.toISOString()
        );

        const expiredCount = Number(result[0]?.count ?? 0);
        const totalResult = await db.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM ${policy.table}`
        );
        const currentCount = Number(totalResult[0]?.count ?? 0);

        candidates.push({
          table: policy.table,
          tableName: policy.tableName,
          retentionDays: policy.retentionDays,
          cutoffDate,
          currentCount,
          expiredCount,
          estimatedSavingsBytes: expiredCount * policy.avgRowBytes,
          estimatedSavingsReadable: formatBytes(expiredCount * policy.avgRowBytes),
          riskLevel: policy.riskLevel,
          notes: policy.notes,
        });
      } catch (error) {
        // Table might not exist or query might fail
        logger.warn(`Failed to count archival candidates for ${policy.table}`, {
          error: (error as Error).message,
        });
        candidates.push({
          table: policy.table,
          tableName: policy.tableName,
          retentionDays: policy.retentionDays,
          cutoffDate,
          currentCount: 0,
          expiredCount: 0,
          estimatedSavingsBytes: 0,
          estimatedSavingsReadable: '0 B',
          riskLevel: policy.riskLevel,
          notes: `Unable to count records: ${(error as Error).message}`,
        });
      }
    }

    // Sort by expired count descending
    candidates.sort((a, b) => b.expiredCount - a.expiredCount);

    logger.info('Archival candidates identified', {
      totalCandidates: candidates.length,
      totalExpiredRecords: candidates.reduce((sum, c) => sum + c.expiredCount, 0),
      totalSavings: formatBytes(candidates.reduce((sum, c) => sum + c.estimatedSavingsBytes, 0)),
    });

    return candidates;
  }

  // ===================================================================
  // 4. STORAGE STATS
  // ===================================================================

  async getStorageStats(): Promise<StorageStatsResult> {
    logger.info('Collecting storage statistics');
    const timestamp = new Date().toISOString();
    const tables: TableStorageInfo[] = [];

    // Define table metadata with estimated avg row sizes
    const tableMeta: { table: string; model: string; avgRowBytes: number; isHighGrowth: boolean }[] = [
      { table: 'telemetry_readings', model: 'TelemetryReading', avgRowBytes: 80, isHighGrowth: true },
      { table: 'telemetry_streams', model: 'TelemetryStream', avgRowBytes: 100, isHighGrowth: true },
      { table: 'downsampled_readings', model: 'DownsampledReading', avgRowBytes: 100, isHighGrowth: true },
      { table: 'iot_readings', model: 'IotReading', avgRowBytes: 80, isHighGrowth: true },
      { table: 'event_stream_records', model: 'EventStreamRecord', avgRowBytes: 300, isHighGrowth: true },
      { table: 'audit_logs', model: 'AuditLog', avgRowBytes: 500, isHighGrowth: true },
      { table: 'component_condition_readings', model: 'ComponentConditionReading', avgRowBytes: 150, isHighGrowth: true },
      { table: 'anomaly_records', model: 'AnomalyRecord', avgRowBytes: 250, isHighGrowth: false },
      { table: 'work_orders', model: 'WorkOrder', avgRowBytes: 800, isHighGrowth: false },
      { table: 'maintenance_requests', model: 'MaintenanceRequest', avgRowBytes: 600, isHighGrowth: false },
      { table: 'assets', model: 'Asset', avgRowBytes: 1000, isHighGrowth: false },
      { table: 'wo_comments', model: 'WorkOrderComment', avgRowBytes: 400, isHighGrowth: true },
      { table: 'mr_comments', model: 'MaintenanceRequestComment', avgRowBytes: 400, isHighGrowth: true },
      { table: 'wo_time_logs', model: 'WorkOrderTimeLog', avgRowBytes: 200, isHighGrowth: true },
      { table: 'wo_materials', model: 'WorkOrderMaterial', avgRowBytes: 300, isHighGrowth: false },
      { table: 'wo_team_members', model: 'WorkOrderTeamMember', avgRowBytes: 100, isHighGrowth: false },
      { table: 'wo_status_history', model: 'WorkOrderStatusHistory', avgRowBytes: 300, isHighGrowth: true },
      { table: 'notifications', model: 'Notification', avgRowBytes: 300, isHighGrowth: true },
      { table: 'sessions', model: 'Session', avgRowBytes: 200, isHighGrowth: false },
      { table: 'chat_messages', model: 'ChatMessage', avgRowBytes: 500, isHighGrowth: true },
      { table: 'users', model: 'User', avgRowBytes: 500, isHighGrowth: false },
      { table: 'roles', model: 'Role', avgRowBytes: 200, isHighGrowth: false },
      { table: 'permissions', model: 'Permission', avgRowBytes: 200, isHighGrowth: false },
      { table: 'inventory_items', model: 'InventoryItem', avgRowBytes: 700, isHighGrowth: false },
      { table: 'stock_movements', model: 'StockMovement', avgRowBytes: 300, isHighGrowth: true },
      { table: 'pm_schedules', model: 'PmSchedule', avgRowBytes: 400, isHighGrowth: false },
      { table: 'workflow_instances', model: 'WorkflowInstance', avgRowBytes: 350, isHighGrowth: true },
      { table: 'workflow_step_history', model: 'WorkflowStepHistory', avgRowBytes: 400, isHighGrowth: true },
      { table: 'attachments', model: 'Attachment', avgRowBytes: 300, isHighGrowth: true },
      { table: 'component_registry', model: 'ComponentRegistry', avgRowBytes: 600, isHighGrowth: false },
      { table: 'digital_twins', model: 'DigitalTwin', avgRowBytes: 500, isHighGrowth: false },
      { table: 'system_diagrams', model: 'SystemDiagram', avgRowBytes: 500, isHighGrowth: false },
      { table: 'model_library', model: 'ModelLibrary', avgRowBytes: 600, isHighGrowth: false },
      { table: 'repair_material_requests', model: 'RepairMaterialRequest', avgRowBytes: 400, isHighGrowth: false },
      { table: 'repair_tool_requests', model: 'RepairToolRequest', avgRowBytes: 300, isHighGrowth: false },
      { table: 'safety_incidents', model: 'SafetyIncident', avgRowBytes: 600, isHighGrowth: false },
      { table: 'quality_inspections', model: 'QualityInspection', avgRowBytes: 500, isHighGrowth: false },
      { table: 'production_orders', model: 'ProductionOrder', avgRowBytes: 500, isHighGrowth: false },
      { table: 'tool_transactions', model: 'ToolTransaction', avgRowBytes: 200, isHighGrowth: true },
      { table: 'alarm_events', model: 'AlarmEvent', avgRowBytes: 300, isHighGrowth: true },
      { table: 'failure_records', model: 'FailureRecord', avgRowBytes: 400, isHighGrowth: false },
      { table: 'escalation_logs', model: 'EscalationLog', avgRowBytes: 300, isHighGrowth: false },
      { table: 'sync_operations', model: 'SyncOperation', avgRowBytes: 400, isHighGrowth: true },
      { table: 'engineering_documents', model: 'EngineeringDocument', avgRowBytes: 600, isHighGrowth: false },
      { table: 'sto_events', model: 'StoEvent', avgRowBytes: 500, isHighGrowth: false },
      { table: 'telemetry_batches', model: 'TelemetryBatch', avgRowBytes: 200, isHighGrowth: true },
      { table: 'connectivity_sessions', model: 'ConnectivitySession', avgRowBytes: 300, isHighGrowth: false },
      { table: 'component_maintenance_history', model: 'ComponentMaintenanceHistory', avgRowBytes: 400, isHighGrowth: true },
      { table: 'component_lubrication_records', model: 'ComponentLubricationRecord', avgRowBytes: 300, isHighGrowth: true },
      { table: 'geofence_events', model: 'GeofenceEvent', avgRowBytes: 200, isHighGrowth: true },
      { table: 'document_search_logs', model: 'DocumentSearchLog', avgRowBytes: 200, isHighGrowth: true },
    ];

    for (const meta of tableMeta) {
      try {
        const result = await db.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM ${meta.table}`
        );
        const recordCount = Number(result[0]?.count ?? 0);

        tables.push({
          table: meta.table,
          recordCount,
          estimatedSizeBytes: recordCount * meta.avgRowBytes,
          estimatedSizeReadable: formatBytes(recordCount * meta.avgRowBytes),
          avgRowSizeBytes: meta.avgRowBytes,
          growthIndicator: meta.isHighGrowth ? 'high' : 'low',
          hasTimestamp: true,
        });
      } catch (error) {
        logger.warn(`Failed to count records for ${meta.table}`, {
          error: (error as Error).message,
        });
        tables.push({
          table: meta.table,
          recordCount: 0,
          estimatedSizeBytes: 0,
          estimatedSizeReadable: '0 B',
          avgRowSizeBytes: meta.avgRowBytes,
          growthIndicator: meta.isHighGrowth ? 'high' : 'low',
          hasTimestamp: true,
        });
      }
    }

    const totalEstimatedBytes = tables.reduce((sum, t) => sum + t.estimatedSizeBytes, 0);
    const sortedBySize = [...tables].sort((a, b) => b.estimatedSizeBytes - a.estimatedSizeBytes);
    const largestTables = sortedBySize.slice(0, 10);
    const highGrowthTables = tables
      .filter(t => t.growthIndicator === 'high' && t.recordCount > 0)
      .map(t => t.table);

    logger.info('Storage stats collected', {
      totalTables: tables.length,
      totalEstimatedSize: formatBytes(totalEstimatedBytes),
      largestTable: largestTables[0]?.table,
    });

    return {
      timestamp,
      tables,
      totalEstimatedBytes,
      totalEstimatedReadable: formatBytes(totalEstimatedBytes),
      largestTables,
      highGrowthTables,
    };
  }
}

export const databaseAuditService = new DatabaseAuditService();
export type {
  IndexAuditResult,
  IndexInfo,
  IndexRecommendation,
  QueryOptimizationReport,
  ArchivalCandidate,
  StorageStatsResult,
  TableStorageInfo,
};
