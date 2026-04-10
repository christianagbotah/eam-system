<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// EAM API Routes
$routes->group('api/v1/eam', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Health Check (No auth required)
    $routes->get('health', 'HealthController::index');
    
    // Auth Routes (No JWT required)
    $routes->post('auth/login', 'EamAuthController::login');
    $routes->post('auth/logout', 'EamAuthController::logout', ['filter' => 'jwtauth']);
    $routes->post('auth/refresh', 'EamAuthController::refresh');
    $routes->post('auth/forgot-password', 'PasswordResetController::requestReset');
    $routes->post('auth/reset-password', 'PasswordResetController::resetPassword');
    
    // Dashboard Routes (JWT required)
    $routes->get('dashboard/stats', 'DashboardController::stats', ['filter' => 'jwtauth']);
    $routes->get('dashboard/admin', 'DashboardController::admin', ['filter' => 'jwtauth']);
    $routes->get('dashboard/supervisor', 'DashboardController::supervisor', ['filter' => 'jwtauth']);
    $routes->get('dashboard/technician', 'DashboardController::technician', ['filter' => 'jwtauth']);
    $routes->get('dashboard/operator', 'DashboardController::operator', ['filter' => 'jwtauth']);
    
    // Digital Twin Routes
    $routes->get('digital-twin/metrics', 'DigitalTwinController::metrics');
});

// Analytics Routes (separate namespace)
$routes->group('api/v1/eam/analytics', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    $routes->get('kpis', 'DashboardController::stats');
    $routes->get('assets/(:num)/kpis', 'AnalyticsController::getAssetKPIs/$1');
    $routes->get('departments', 'AnalyticsController::getDepartmentMetrics');
    $routes->get('maintenance-costs', 'AnalyticsController::getMaintenanceCosts');
    $routes->get('downtime', 'AnalyticsController::getDowntimeAnalysis');
});

// EAM API Routes (continued)
$routes->group('api/v1/eam', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Equipment Routes (No JWT for development)
    $routes->get('equipment/(:num)', 'EamEquipmentController::show/$1');
    $routes->get('equipment/(:num)/parts', 'EquipmentPartsController::getEquipmentParts/$1');
    $routes->get('parts/(:num)/history', 'EquipmentPartsController::getPartHistory/$1');
    $routes->get('parts/(:num)/pm-status', 'EquipmentPartsController::getPartPMStatus/$1');
    $routes->post('pm-rules', 'EamPmController::createRule');
    
    // Production Survey Routes (No JWT for development)
    $routes->get('production-survey/daily', 'ProductionSurveyController::getDailySurveys');
    $routes->post('production-survey/daily', 'ProductionSurveyController::createDailySurvey');
    $routes->put('production-survey/daily/(:num)', 'ProductionSurveyController::updateDailySurvey/$1');
    $routes->get('production-survey/weekly', 'ProductionSurveyController::getWeeklySummary');
    $routes->get('production-survey/work-centers', 'ProductionSurveyController::getWorkCenters');
    
    // Maintenance Request Routes (No JWT for development)
    $routes->get('maintenance/requests', 'MaintenanceRequestController::index');
    $routes->get('maintenance/requests/my-queue', 'MaintenanceRequestController::myQueue');
    $routes->post('maintenance/requests', 'MaintenanceRequestController::create');
    $routes->put('maintenance/requests/(:num)', 'MaintenanceRequestController::update/$1');
    $routes->delete('maintenance/requests/(:num)', 'MaintenanceRequestController::delete/$1');
    $routes->post('maintenance/requests/(:num)/approve', 'MaintenanceRequestController::approve/$1');
    $routes->post('maintenance/requests/(:num)/reject', 'MaintenanceRequestController::reject/$1');
    $routes->post('maintenance/requests/(:num)/assign-planner', 'MaintenanceRequestController::assignToPlanner/$1');
    $routes->post('maintenance/requests/(:num)/create-work-order', 'MaintenanceRequestController::createWorkOrder/$1');
    $routes->post('maintenance/requests/(:num)/start-work', 'MaintenanceRequestController::startWork/$1');
    $routes->post('maintenance/requests/(:num)/complete', 'MaintenanceRequestController::markCompleted/$1');
    $routes->post('maintenance/requests/(:num)/satisfactory', 'MaintenanceRequestController::markSatisfactory/$1');
    $routes->post('maintenance/requests/(:num)/close', 'MaintenanceRequestController::closeRequest/$1');
    $routes->get('maintenance/requests/(:num)/workflow', 'MaintenanceRequestController::getWorkflow/$1');
    $routes->get('maintenance/requests/dashboard', 'MaintenanceRequestController::dashboard');
    
    
    // System Settings Routes (No JWT for development)
    $routes->get('settings/theme', 'SystemSettingsController::theme');
    $routes->get('settings/system', 'SystemSettingsController::index');
    $routes->put('settings/system', 'SystemSettingsController::update');
    
    // Equipment Routes (No JWT for development)
    $routes->get('equipment', 'EamEquipmentController::index');
    $routes->get('equipment/(:num)', 'EamEquipmentController::show/$1');
    $routes->post('equipment', 'EamEquipmentController::create');
    $routes->put('equipment/(:num)', 'EamEquipmentController::update/$1');
    $routes->delete('equipment/(:num)', 'EamEquipmentController::delete/$1');
    
    // Assets Unified Routes
    $routes->get('assets-unified', 'AssetsUnifiedController::index');
    
    // Machine Routes (No JWT for development)
    $routes->get('machines', 'MachineController::index');
    $routes->get('machines/(:num)', 'MachineController::show/$1');
    $routes->post('machines', 'MachineController::create');
    $routes->put('machines/(:num)', 'MachineController::update/$1');
    $routes->delete('machines/(:num)', 'MachineController::delete/$1');
    
    // Assembly Routes (No JWT for development)
    $routes->get('assemblies', 'AssemblyController::index');
    $routes->get('assemblies/(:num)', 'AssemblyController::show/$1');
    $routes->post('assemblies', 'AssemblyController::create');
    $routes->put('assemblies/(:num)', 'AssemblyController::update/$1');
    $routes->delete('assemblies/(:num)', 'AssemblyController::delete/$1');
    
    // Part Routes (No JWT for development)
    $routes->get('parts', 'PartController::index');
    $routes->get('parts/(:num)', 'PartController::show/$1');
    $routes->get('parts/nested/(:num)', 'PartController::getNestedParts/$1');
    $routes->post('parts', 'PartController::create');
    $routes->put('parts/(:num)', 'PartController::update/$1');
    $routes->delete('parts/(:num)', 'PartController::delete/$1');
    
    // Asset Breakdown Structure (ABS) Routes
    $routes->get('asset-tree/(:num)', 'AssetTreeController::getTree/$1');
    $routes->get('asset-node/(:num)', 'AssetTreeController::getNode/$1');
    $routes->post('asset-node', 'AssetTreeController::createNode');
    $routes->put('asset-node/(:num)', 'AssetTreeController::updateNode/$1');
    $routes->delete('asset-node/(:num)', 'AssetTreeController::deleteNode/$1');
    $routes->post('asset-node/reorder', 'AssetTreeController::reorderNodes');
    $routes->post('asset-node/hotspot', 'AssetTreeController::createHotspot');
    $routes->get('asset-hotspots/(:num)', 'AssetTreeController::getHotspots/$1');
    $routes->post('asset-usage', 'AssetTreeController::recordUsage');
    
    // PM System Routes
    $routes->get('pm-templates', 'PmController::index');
    $routes->get('pm-template/(:num)', 'PmController::show/$1');
    $routes->post('pm-template', 'PmController::create');
    $routes->put('pm-template/(:num)', 'PmController::update/$1');
    $routes->delete('pm-template/(:num)', 'PmController::delete/$1');
    $routes->post('pm-scheduler/run', 'PmController::runScheduler');
    $routes->get('pm-kpis', 'PmController::getKpis');
    $routes->get('pm-work-orders', 'PmController::getWorkOrders');
    $routes->put('pm-work-order/(:num)', 'PmController::updateWorkOrder/$1');
    
    // Work Order Management Routes
    $routes->get('work-orders', 'WorkOrdersController::index');
    $routes->get('work-orders/(:num)', 'WorkOrdersController::show/$1');
    $routes->post('work-orders', 'WorkOrdersController::create');
    $routes->put('work-orders/(:num)', 'WorkOrdersController::update/$1');
    $routes->post('work-orders/(:num)/assign', 'WorkOrdersController::assign/$1');
    $routes->post('work-orders/(:num)/start', 'WorkOrdersController::start/$1');
    $routes->post('work-orders/(:num)/pause', 'WorkOrdersController::pause/$1');
    $routes->post('work-orders/(:num)/complete', 'WorkOrdersController::complete/$1');
    $routes->post('work-orders/(:num)/reopen', 'WorkOrdersController::reopen/$1');
    $routes->get('work-orders/(:num)/history', 'WorkOrdersController::history/$1');
    
    // Work Order Materials
    $routes->get('work-orders/(:num)/materials', 'WorkOrderMaterialsController::index/$1');
    $routes->post('work-orders/(:num)/materials', 'WorkOrderMaterialsController::create/$1');
    $routes->put('work-orders/(:num)/materials/(:num)', 'WorkOrderMaterialsController::update/$1/$2');
    $routes->delete('work-orders/(:num)/materials/(:num)', 'WorkOrderMaterialsController::delete/$2');
    $routes->post('work-orders/(:num)/materials/(:num)/reserve', 'WorkOrderMaterialsController::reserve/$1/$2');
    $routes->post('work-orders/(:num)/materials/(:num)/issue', 'WorkOrderMaterialsController::issue/$2');
    $routes->post('work-orders/(:num)/materials/(:num)/release', 'WorkOrderMaterialsController::release/$1/$2');
    
    // Work Order Attachments
    $routes->post('work-orders/(:num)/attachments', 'WorkOrderAttachmentsController::upload/$1');
    $routes->get('work-orders/(:num)/attachments', 'WorkOrderAttachmentsController::index/$1');
    $routes->get('attachments/(:num)/download', 'WorkOrderAttachmentsController::download/$1');
    $routes->delete('attachments/(:num)', 'WorkOrderAttachmentsController::delete/$1');
    
    // Work Order Assignment
    $routes->post('work-orders/(:num)/assign', 'WorkOrderAssignmentController::assign/$1');
    $routes->post('work-orders/(:num)/reassign', 'WorkOrderAssignmentController::reassign/$1');
    $routes->post('work-orders/(:num)/unassign', 'WorkOrderAssignmentController::unassign/$1');
    $routes->get('work-orders/(:num)/available-technicians', 'WorkOrderAssignmentController::getAvailableTechnicians/$1');
    
    // Work Order SLA
    $routes->get('work-orders/(:num)/sla-status', 'WorkOrdersController::slaStatus/$1');
    $routes->put('work-orders/(:num)/sla-hours', 'WorkOrdersController::updateSlaHours/$1');
    $routes->get('sla/breached', 'WorkOrdersController::breachedSLA');
    
    // Work Order Logs
    $routes->get('work-orders/(:num)/logs', 'WorkOrderLogsController::index/$1');
    $routes->post('work-orders/(:num)/logs', 'WorkOrderLogsController::create/$1');
    
    // Meters Routes
    $routes->get('assets/(:segment)/(:num)/meters', 'MetersController::listByNode/$1/$2');
    $routes->post('meters', 'MetersController::create');
    $routes->get('meters/(:num)', 'MetersController::show/$1');
    $routes->post('meters/(:num)/readings', 'MetersController::addReading/$1');
    $routes->get('meters/(:num)/readings', 'MetersController::readings/$1');
    
    // Authenticated Meter Routes
    $routes->post('api/v1/meters/(:num)/readings', 'Api\V1\MetersController::addReading/$1', ['filter'=>'jwtauth']);
    $routes->get('api/v1/meters/(:num)/readings', 'Api\V1\MetersController::readings/$1', ['filter'=>'jwtauth']);
    $routes->post('api/v1/meters', 'Api\V1\MetersController::create', ['filter'=>'jwtauth']);
    $routes->get('api/v1/assets/(:segment)/(:num)/meters', 'Api\V1\MetersController::listByNode/$1/$2', ['filter'=>'jwtauth']);
    
    // Hotspots Routes
    $routes->get('hotspots', 'HotspotsController::index');
    $routes->post('hotspots', 'HotspotsController::create');
    $routes->put('hotspots/(:num)', 'HotspotsController::update/$1');
    $routes->delete('hotspots/(:num)', 'HotspotsController::delete/$1');
    
    // Unified Assets Routes (Grade A)
    $routes->get('assets-unified', 'Asset\AssetsUnifiedController::index');
    $routes->get('assets-unified/(:num)', 'Asset\AssetsUnifiedController::show/$1');
    $routes->post('assets-unified', 'Asset\AssetsUnifiedController::create');
    $routes->put('assets-unified/(:num)', 'Asset\AssetsUnifiedController::update/$1');
    $routes->delete('assets-unified/(:num)', 'Asset\AssetsUnifiedController::delete/$1');
    $routes->get('assets-unified/(:num)/hierarchy', 'Asset\AssetsUnifiedController::hierarchy/$1');
    
    // Asset Management Module Routes
    $routes->group('assets', ['namespace' => 'App\Controllers\Api\V1\Asset'], function($routes) {
        $routes->get('machines', 'MachinesController::index');
        $routes->get('machines/(:num)', 'MachinesController::show/$1');
        $routes->post('machines', 'MachinesController::create');
        $routes->put('machines/(:num)', 'MachinesController::update/$1');
        $routes->delete('machines/(:num)', 'MachinesController::delete/$1');
        $routes->get('machines/(:num)/assemblies', 'MachinesController::assemblies/$1');
        $routes->post('machines/(:num)/assemblies', 'AssembliesController::create/$1');
        
        $routes->get('assemblies/(:num)', 'AssembliesController::show/$1');
        $routes->put('assemblies/(:num)', 'AssembliesController::update/$1');
        $routes->get('assemblies/(:num)/parts', 'AssembliesController::parts/$1');
        
        $routes->get('parts/(:num)', 'PartsController::show/$1');
        $routes->post('assemblies/(:num)/parts', 'PartsController::create/$1');
        $routes->put('parts/(:num)', 'PartsController::update/$1');
        $routes->post('parts/(:num)/media', 'PartsController::uploadMedia/$1');
        $routes->get('parts/(:num)/bom', 'PartsController::bom/$1');
        
        $routes->post('bom', 'BomController::create');
        $routes->get('bom', 'BomController::index');
        $routes->post('bom/import', 'BomController::import');
        $routes->get('bom/export', 'BomController::export');
        
        $routes->get('tree/(:num)', 'TreeController::show/$1');
        
        // Grade-A: Hierarchy Routes
        $routes->get('hierarchy/tree', 'HierarchyController::getTree');
        $routes->get('hierarchy/tree/(:num)', 'HierarchyController::getTree/$1');
        $routes->get('hierarchy/ancestors/(:num)', 'HierarchyController::getAncestors/$1');
        $routes->get('hierarchy/descendants/(:num)', 'HierarchyController::getDescendants/$1');
        $routes->get('hierarchy/breadcrumb/(:num)', 'HierarchyController::getBreadcrumb/$1');
        $routes->post('hierarchy/move', 'HierarchyController::move');
        $routes->get('hierarchy/search', 'HierarchyController::search');
        
        // Grade-A: 3D Model Routes
        $routes->post('3d-model/upload', 'Model3DController::upload');
        $routes->get('3d-model/(:num)', 'Model3DController::getModel/$1');
        $routes->post('3d-model/(:num)/hotspot', 'Model3DController::addHotspot/$1');
        $routes->get('3d-model/(:num)/hotspots', 'Model3DController::getHotspots/$1');
        $routes->delete('3d-model/(:num)', 'Model3DController::delete/$1');
        
        // Grade-A: Visualization Routes
        $routes->get('visualization/tree', 'VisualizationController::getTreeData');
        $routes->get('visualization/tree/(:num)', 'VisualizationController::getTreeData/$1');
        $routes->get('visualization/health-matrix', 'VisualizationController::getHealthMatrix');
        $routes->get('visualization/relationship-graph/(:num)', 'VisualizationController::getRelationshipGraph/$1');
        
        // Grade-A: Relationship Routes
        $routes->post('relationship', 'RelationshipController::create');
        $routes->get('relationship/(:num)', 'RelationshipController::getRelationships/$1');
        $routes->get('relationship/graph/(:num)', 'RelationshipController::getGraph/$1');
        $routes->get('relationship/path', 'RelationshipController::findPath');
        $routes->delete('relationship/(:num)', 'RelationshipController::delete/$1');
    });
    
    // Mobile Sync Routes
    $routes->post('mobile/wo-sync', 'MobileController::woSync');
    
    // Quick Wins Features
    $routes->get('barcode/generate/(:num)', 'BarcodeController::generate/$1');
    $routes->post('barcode/scan', 'BarcodeController::scan');
    $routes->post('bulk/update-assets', 'BulkOperationsController::updateAssets');
    $routes->post('bulk/create-work-orders', 'BulkOperationsController::createWorkOrders');
    $routes->post('bulk/delete', 'BulkOperationsController::deleteMultiple');
    $routes->get('search/global', 'SearchController::global');
    $routes->post('search/advanced', 'SearchController::advanced');
    
    // Predictive Analytics
    $routes->get('predictive/health/(:num)', 'PredictiveController::calculateHealth/$1');
    $routes->get('predictive/anomalies/(:num)', 'PredictiveController::detectAnomalies/$1');
    $routes->get('predictive/at-risk', 'PredictiveController::assetsAtRisk');
    $routes->post('predictive/run-all', 'PredictiveController::runPredictions');
    
    // Protected Routes (JWT required)
    $routes->group('', ['filter' => 'jwtauth'], function($routes) {
        
        // Facilities
        $routes->get('facilities', 'EamFacilitiesController::index');
        $routes->get('facilities/(:num)', 'EamFacilitiesController::show/$1');
        $routes->post('facilities', 'EamFacilitiesController::create');
        $routes->put('facilities/(:num)', 'EamFacilitiesController::update/$1');
        $routes->delete('facilities/(:num)', 'EamFacilitiesController::delete/$1');
        
        // Systems
        $routes->get('systems', 'EamSystemsController::index');
        $routes->get('systems/(:num)', 'EamSystemsController::show/$1');
        $routes->post('systems', 'EamSystemsController::create');
        $routes->put('systems/(:num)', 'EamSystemsController::update/$1');
        $routes->delete('systems/(:num)', 'EamSystemsController::delete/$1');
        $routes->get('equipment/(:num)/assignees', 'AssignmentsController::getAssetAssignees/$1');
        $routes->get('equipment/(:num)/parts', 'EquipmentPartsController::getEquipmentParts/$1');
        $routes->get('parts/(:num)/history', 'EquipmentPartsController::getPartHistory/$1');
        $routes->get('parts/(:num)/pm-status', 'EquipmentPartsController::getPartPMStatus/$1');
        
        // Assets
        $routes->get('assets/(:num)/pm-status', 'AssetsController::getPMStatus/$1');
        
        // Assemblies
        $routes->get('assemblies', 'AssemblyController::index');
        $routes->get('assemblies/(:num)', 'AssemblyController::show/$1');
        $routes->post('assemblies', 'AssemblyController::create');
        $routes->put('assemblies/(:num)', 'AssemblyController::update/$1');
        $routes->delete('assemblies/(:num)', 'AssemblyController::delete/$1');
        
        // Components
        $routes->get('components', 'EamComponentsController::index');
        $routes->get('components/(:num)', 'EamComponentsController::show/$1');
        $routes->post('components', 'EamComponentsController::create');
        $routes->put('components/(:num)', 'EamComponentsController::update/$1');
        $routes->delete('components/(:num)', 'EamComponentsController::delete/$1');
        
        // Parts
        $routes->get('parts', 'EamPartsController::index');
        $routes->get('parts/(:num)', 'EamPartsController::show/$1');
        $routes->post('parts', 'EamPartsController::create');
        $routes->put('parts/(:num)', 'EamPartsController::update/$1');
        $routes->delete('parts/(:num)', 'EamPartsController::delete/$1');
        
        // Preventive Maintenance
        $routes->get('pm-rules', 'EamPmController::getRules');
        $routes->post('pm-rules', 'EamPmController::createRule');
        $routes->put('pm-rules/(:num)', 'EamPmController::updateRule/$1');
        $routes->post('pm-schedules/generate', 'EamPmController::generateSchedules');
        $routes->get('pm-schedules/(:num)', 'EamPmController::getSchedules/$1');
        
        // Work Orders
        $routes->get('work-orders', 'EamWorkOrdersController::index');
        $routes->get('work-orders/(:num)', 'EamWorkOrdersController::show/$1');
        $routes->post('work-orders', 'EamWorkOrdersController::create');
        $routes->put('work-orders/(:num)', 'EamWorkOrdersController::update/$1');
        $routes->post('work-orders/(:num)/assign', 'EamWorkOrdersController::assign/$1');
        $routes->post('work-orders/(:num)/complete', 'EamWorkOrdersController::complete/$1');
        $routes->delete('work-orders/(:num)', 'EamWorkOrdersController::delete/$1');
        
        // Inventory
        $routes->get('inventory', 'EamInventoryController::index');
        $routes->get('inventory/(:num)', 'EamInventoryController::show/$1');
        $routes->post('inventory', 'EamInventoryController::create');
        $routes->put('inventory/(:num)', 'EamInventoryController::update/$1');
        $routes->delete('inventory/(:num)', 'EamInventoryController::delete/$1');
        $routes->post('inventory/stock-in', 'EamInventoryController::stockIn');
        $routes->post('inventory/stock-out', 'EamInventoryController::stockOut');
        $routes->post('inventory/reserve', 'EamInventoryController::reserve');
        
        // Users
        $routes->get('users', 'EamUsersController::index');
        $routes->get('users/(:num)', 'EamUsersController::show/$1');
        $routes->post('users', 'EamUsersController::create');
        $routes->put('users/(:num)', 'EamUsersController::update/$1');
        $routes->delete('users/(:num)', 'EamUsersController::delete/$1');
        $routes->post('users/(:num)/assign-role', 'EamUsersController::assignRole/$1');
        
        // Roles
        $routes->get('roles', 'EamRolesController::index');
        $routes->get('roles/(:num)', 'EamRolesController::show/$1');
        $routes->post('roles', 'EamRolesController::create');
        $routes->put('roles/(:num)', 'EamRolesController::update/$1');
        $routes->delete('roles/(:num)', 'EamRolesController::delete/$1');
        $routes->post('roles/(:num)/assign-permissions', 'EamRolesController::assignPermissions/$1');
        
        // Meters
        $routes->get('meters', 'MetersController::index');
        $routes->get('meters/(:num)', 'MetersController::show/$1');
        $routes->post('meters', 'MetersController::create');
        $routes->put('meters/(:num)', 'MetersController::update/$1');
        $routes->delete('meters/(:num)', 'MetersController::delete/$1');
        $routes->post('meters/(:num)/readings', 'MetersController::recordReading/$1');
        $routes->post('meters/(:num)/recompute', 'MetersController::recompute/$1');
        
        // Departments
        $routes->get('departments', 'DepartmentsController::index');
        $routes->get('departments/(:num)', 'DepartmentsController::show/$1');
        $routes->post('departments', 'DepartmentsController::create');
        $routes->put('departments/(:num)', 'DepartmentsController::update/$1');
        $routes->delete('departments/(:num)', 'DepartmentsController::delete/$1');
        $routes->get('departments/(:num)/roster', 'DepartmentsController::roster/$1');
        
        // Shifts
        $routes->get('shifts', 'ShiftsController::index');
        $routes->get('shifts/(:num)', 'ShiftsController::show/$1');
        $routes->post('shifts', 'ShiftsController::create');
        $routes->put('shifts/(:num)', 'ShiftsController::update/$1');
        $routes->delete('shifts/(:num)', 'ShiftsController::delete/$1');
        
        // Employee Shifts
        $routes->get('employee-shifts', 'EmployeeShiftsController::index');
        $routes->post('employee-shifts', 'EmployeeShiftsController::assign');
        $routes->post('employee-shifts/bulk-assign', 'EmployeeShiftsController::bulkAssign');
        $routes->post('employee-shifts/bulk-import', 'EmployeeShiftsController::bulkImport');
        $routes->delete('employee-shifts/(:num)', 'EmployeeShiftsController::delete/$1');
        
        // Sub-Parts
        $routes->get('sub-parts', 'SubPartsController::index');
        $routes->get('sub-parts/(:num)', 'SubPartsController::show/$1');
        $routes->post('sub-parts', 'SubPartsController::create');
        $routes->put('sub-parts/(:num)', 'SubPartsController::update/$1');
        $routes->delete('sub-parts/(:num)', 'SubPartsController::delete/$1');
        
        // Asset Hierarchy
        $routes->get('assets/hierarchy', 'AssetHierarchyController::getHierarchy');
        
        // PM Rules & Schedules
        $routes->get('pm-schedules', 'EamPmController::getSchedules');
        $routes->post('pm-rules/(:num)/generate-schedule', 'EamPmController::generateSchedule/$1');
        $routes->post('pm-rules/(:num)/recompute-next', 'EamPmController::recomputeNext/$1');
        
        // Work Order Materials
        $routes->post('work-orders/(:num)/materials/issue', 'EamWorkOrdersController::issueMaterials/$1');
        
        // Inventory Operations
        $routes->post('inventory/(:num)/reserve', 'EamInventoryController::reserve/$1');
        $routes->post('inventory/(:num)/consume', 'EamInventoryController::consume/$1');
        
        // Production
        $routes->get('production', 'ProductionController::index');
        $routes->get('production/(:num)', 'ProductionController::show/$1');
        $routes->post('production', 'ProductionController::create');
        $routes->put('production/(:num)', 'ProductionController::update/$1');
        $routes->delete('production/(:num)', 'ProductionController::delete/$1');
        
        // Production Runs
        $routes->get('production-runs', 'ProductionRunsController::index');
        $routes->get('production-runs/(:num)', 'ProductionRunsController::show/$1');
        $routes->post('production-runs', 'ProductionRunsController::create');
        $routes->post('production-runs/(:num)/surveys', 'ProductionRunsController::createSurvey/$1');
        $routes->get('production-runs/(:num)/surveys', 'ProductionRunsController::getSurveys/$1');
        
        // Reports
        $routes->get('reports/pm-history', 'ReportsController::pmHistory');
        $routes->get('reports/wo-history', 'ReportsController::workOrderHistory');
        $routes->get('reports/inventory-movements', 'ReportsController::inventoryMovements');
        $routes->get('reports/asset-utilization', 'ReportsController::assetUtilization');
        $routes->get('reports/maintenance-costs', 'ReportsController::maintenanceCosts');
        
        // Metrics & KPIs
        $routes->get('metrics/dashboard', 'MetricsController::dashboard');
        $routes->get('metrics/asset/(:num)', 'MetricsController::assetMetrics/$1');
        
        // Work Order Attachments
        $routes->post('work-orders/(:num)/attachments', 'WorkOrderAttachmentsController::upload/$1');
        $routes->get('work-orders/(:num)/attachments', 'WorkOrderAttachmentsController::index/$1');
        $routes->get('attachments/(:num)/download', 'WorkOrderAttachmentsController::download/$1');
        $routes->delete('attachments/(:num)', 'WorkOrderAttachmentsController::delete/$1');
        
        // Notifications
        $routes->get('notifications', 'NotificationController::index');
        $routes->put('notifications/(:num)/read', 'NotificationController::markAsRead/$1');
        $routes->put('notifications/mark-all-read', 'NotificationController::markAllAsRead');
        $routes->delete('notifications/(:num)', 'NotificationController::delete/$1');
        
        // User Permissions (RBAC)
        $routes->get('users/(:num)/permissions', 'UserPermissionsController::getUserPermissions/$1');
        
        // Dashboard
        $routes->get('dashboard/summary', 'DashboardController::summary');
        
        // Equipment Assignments
        $routes->get('assignments', 'AssignmentsController::index');
        $routes->get('assignments/(:num)', 'AssignmentsController::show/$1');
        $routes->post('assignments', 'AssignmentsController::create');
        $routes->put('assignments/(:num)', 'AssignmentsController::update/$1');
        $routes->delete('assignments/(:num)', 'AssignmentsController::delete/$1');
        $routes->get('assets/(:num)/assignees', 'AssignmentsController::getAssetAssignees/$1');
        
        // Production Surveys
        $routes->get('surveys', 'SurveysController::index');
        $routes->get('surveys/(:num)', 'SurveysController::show/$1');
        $routes->post('surveys', 'SurveysController::create');
        $routes->get('production-surveys', 'SurveysController::index');
        $routes->get('production-surveys/(:num)', 'SurveysController::show/$1');
        $routes->post('production-surveys', 'SurveysController::create');
        $routes->post('production-surveys/(:num)/apply', 'SurveysController::apply/$1');
        
        // Operator Groups
        $routes->get('operator-groups', 'OperatorGroupsController::index');
        $routes->post('operator-groups', 'OperatorGroupsController::create');
        $routes->delete('operator-groups/(:num)', 'OperatorGroupsController::delete/$1');
        
        // Reports
        $routes->get('reports/pm-uptime', 'ReportsController::pmUptime');
        $routes->get('reports/mean-time-to-repair', 'ReportsController::meanTimeToRepair');
        
        // IoT Devices Management
        $routes->get('iot/devices', 'IoTDevicesController::index');
        $routes->get('iot/devices/(:num)', 'IoTDevicesController::show/$1');
        $routes->post('iot/devices', 'IoTDevicesController::create');
        $routes->put('iot/devices/(:num)', 'IoTDevicesController::update/$1');
        $routes->delete('iot/devices/(:num)', 'IoTDevicesController::delete/$1');
        
        // IoT Alert Rules
        $routes->get('iot/rules', 'IoTRulesController::index');
        $routes->get('iot/rules/(:num)', 'IoTRulesController::show/$1');
        $routes->post('iot/rules', 'IoTRulesController::create');
        $routes->put('iot/rules/(:num)', 'IoTRulesController::update/$1');
        $routes->delete('iot/rules/(:num)', 'IoTRulesController::delete/$1');
        
        // IoT Data
        $routes->get('iot/devices/(:segment)/metrics', 'IoTDataController::getDeviceMetrics/$1');
        $routes->get('iot/assets/(:num)/metrics', 'IoTDataController::getAssetMetrics/$1');
        $routes->get('iot/alerts', 'IoTDataController::getAlerts');
        $routes->post('iot/alerts/(:segment)/acknowledge', 'IoTDataController::acknowledgeAlert/$1');
        $routes->post('iot/ingest', 'IoTDataController::ingest');
        
        // Analytics (protected routes remain here if needed)
        
        // ERP Integration
        $routes->get('erp/sync-status', 'ERPIntegrationController::getSyncStatus');
        $routes->post('erp/sync/assets', 'ERPIntegrationController::syncAssets');
        $routes->post('erp/sync/work-orders', 'ERPIntegrationController::syncWorkOrders');
        $routes->post('erp/sync/inventory', 'ERPIntegrationController::syncInventory');
        $routes->get('erp/sync-history', 'ERPIntegrationController::getSyncHistory');
        $routes->post('erp/sync/(:segment)/retry', 'ERPIntegrationController::retryFailedSync/$1');
        
        // ERP Field Mapping
        $routes->get('erp/mappings', 'ERPMappingController::index');
        $routes->put('erp/mappings/(:num)', 'ERPMappingController::update/$1');
        $routes->get('erp/mappings/(:segment)', 'ERPMappingController::getMapping/$1');
        
        // ERP Sync Schedules
        $routes->get('erp/schedules', 'ERPScheduleController::index');
        $routes->get('erp/schedules/(:num)', 'ERPScheduleController::show/$1');
        $routes->post('erp/schedules', 'ERPScheduleController::create');
        $routes->put('erp/schedules/(:num)', 'ERPScheduleController::update/$1');
        $routes->delete('erp/schedules/(:num)', 'ERPScheduleController::delete/$1');
        
        // ERP Transformations
        $routes->get('erp/transformations', 'ERPTransformationController::index');
        $routes->get('erp/transformations/(:num)', 'ERPTransformationController::show/$1');
        $routes->post('erp/transformations', 'ERPTransformationController::create');
        $routes->put('erp/transformations/(:num)', 'ERPTransformationController::update/$1');
        $routes->delete('erp/transformations/(:num)', 'ERPTransformationController::delete/$1');
        
        // Predictive Maintenance
        $routes->get('predictive/assets/(:num)', 'PredictiveController::getAssetPrediction/$1');
        $routes->get('predictive/at-risk', 'PredictiveController::getAssetsAtRisk');
        $routes->get('predictive/anomalies', 'PredictiveController::getAnomalies');
        $routes->get('predictive/model-metrics', 'PredictiveController::getModelMetrics');
        
        // Audit Logs
        $routes->get('audit-logs', 'AuditLogsController::index');
        
        // System Health
        $routes->get('system/health', 'SystemHealthController::index');
        
        // Mobile API
        $routes->post('mobile/sync', 'MobileController::syncOfflineData');
        $routes->post('mobile/push-token', 'MobileController::registerPushToken');
        
        // Reports
        $routes->post('reports/generate', 'ReportsController::generate');
        $routes->post('reports/schedule', 'ReportsController::schedule');
        $routes->get('reports/scheduled', 'ReportsController::getScheduled');
        
        // Documents
        $routes->get('documents', 'DocumentsController::index');
        $routes->get('documents/(:num)', 'DocumentsController::show/$1');
        $routes->post('documents/upload', 'DocumentsController::upload');
        $routes->get('documents/(:num)/download', 'DocumentsController::download/$1');
        $routes->post('documents/(:num)/version', 'DocumentsController::newVersion/$1');
        $routes->post('documents/(:num)/request-approval', 'DocumentsController::requestApproval/$1');
        $routes->post('documents/(:num)/approve', 'DocumentsController::approve/$1');
        
        // Inventory Forecasting
        $routes->get('inventory/forecast', 'InventoryForecastController::forecast');
        $routes->get('inventory/abc-analysis', 'InventoryForecastController::abcAnalysis');
        $routes->post('inventory/generate-po', 'InventoryForecastController::generatePO');
        
        // Scheduler
        $routes->get('scheduler/tasks', 'SchedulerController::getTasks');
        $routes->get('scheduler/resources', 'SchedulerController::getResources');
        $routes->post('scheduler/schedule', 'SchedulerController::schedule');
        $routes->put('scheduler/(:num)/reschedule', 'SchedulerController::reschedule/$1');
        $routes->get('scheduler/capacity', 'SchedulerController::getCapacity');
        
        // Quality Management
        $routes->get('quality/non-conformances', 'QualityController::getNonConformances');
        $routes->post('quality/non-conformances', 'QualityController::createNonConformance');
        $routes->put('quality/non-conformances/(:num)', 'QualityController::updateNonConformance/$1');
        $routes->get('quality/checklists', 'QualityController::getChecklists');
        $routes->post('quality/checklists', 'QualityController::createChecklist');
        $routes->post('quality/inspections', 'QualityController::submitInspection');
        $routes->post('quality/capa', 'QualityController::createCAPAAction');
        $routes->get('quality/metrics', 'QualityController::getMetrics');
        
        // Energy Management
        $routes->get('energy/dashboard', 'EnergyController::dashboard');
        $routes->post('energy/record', 'EnergyController::recordConsumption');
        $routes->get('energy/asset/(:num)', 'EnergyController::getAssetConsumption/$1');
        $routes->post('energy/target', 'EnergyController::setTarget');
        $routes->get('energy/efficiency', 'EnergyController::getEfficiencyMetrics');
        
        // Vendor Management
        $routes->get('vendors', 'VendorsController::index');
        $routes->get('vendors/(:num)', 'VendorsController::show/$1');
        $routes->post('vendors', 'VendorsController::create');
        $routes->put('vendors/(:num)', 'VendorsController::update/$1');
        $routes->post('vendors/contracts', 'VendorsController::createContract');
        $routes->post('vendors/performance', 'VendorsController::ratePerformance');
        $routes->get('vendors/contracts/active', 'VendorsController::getContracts');
        
        // AI Assistant
        $routes->post('ai/query', 'AIController::query');
        $routes->get('ai/recommendations', 'AIController::recommendations');
        
        // Collaboration
        $routes->get('work-orders/(:num)/comments', 'CollaborationController::getComments/$1');
        $routes->post('work-orders/(:num)/comments', 'CollaborationController::addComment/$1');
        
        // API Management
        $routes->get('api-keys', 'APIManagementController::index');
        $routes->post('api-keys', 'APIManagementController::create');
        $routes->delete('api-keys/(:num)', 'APIManagementController::revoke/$1');
    });
});

// ============================================================================
// ENTERPRISE WORK ORDER MODULE - Team, Materials, Analytics
// ============================================================================
$routes->group('work-orders/(:num)', function($routes) {
    $routes->get('team', 'WorkOrderTeamController::getTeamMembers/$1');
    $routes->post('team', 'WorkOrderTeamController::addTeamMember/$1');
    $routes->delete('team/(:num)', 'WorkOrderTeamController::removeTeamMember/$1/$2');
    $routes->post('time-log', 'WorkOrderTeamController::logTime/$1');
    $routes->get('time-logs/(:num)', 'WorkOrderTeamController::getTimeLogs/$1/$2');
    $routes->get('timeline', 'WorkOrderAnalyticsController::timeline/$1');
    $routes->get('details', 'WorkOrdersController::getFullDetails/$1');
});

$routes->group('materials', function($routes) {
    $routes->post('request', 'MaterialRequestController::request');
    $routes->get('pending', 'MaterialRequestController::getPending');
    $routes->post('(:num)/approve', 'MaterialRequestController::approve/$1');
    $routes->post('(:num)/issue', 'MaterialRequestController::issue/$1');
    $routes->post('(:num)/usage', 'MaterialRequestController::recordUsage/$1');
});

$routes->group('assistance-requests', function($routes) {
    $routes->get('/', 'AssistanceRequestController::index');
    $routes->get('pending', 'AssistanceRequestController::getPending');
    $routes->post('/', 'AssistanceRequestController::create');
    $routes->post('(:num)/approve', 'AssistanceRequestController::approve/$1');
    $routes->post('(:num)/reject', 'AssistanceRequestController::reject/$1');
});

$routes->group('technician-groups', function($routes) {
    $routes->get('/', 'TechnicianGroupController::index');
    $routes->get('(:num)', 'TechnicianGroupController::show/$1');
    $routes->post('/', 'TechnicianGroupController::create');
    $routes->put('(:num)', 'TechnicianGroupController::update/$1');
    $routes->post('(:num)/members', 'TechnicianGroupController::addMember/$1');
    $routes->delete('(:num)/members/(:num)', 'TechnicianGroupController::removeMember/$1/$2');
});

$routes->group('analytics', function($routes) {
    $routes->get('performance', 'WorkOrderAnalyticsController::performance');
    $routes->get('dashboard-kpis', 'WorkOrderAnalyticsController::dashboardKPIs');
    $routes->get('technician-productivity', 'WorkOrderAnalyticsController::technicianProductivity');
    $routes->get('material-consumption', 'WorkOrderAnalyticsController::materialConsumption');
    $routes->get('failure-analysis', 'WorkOrderAnalyticsController::failureAnalysis');
});

$routes->post('work-orders/create-with-team', 'WorkOrdersController::createWithTeam');
$routes->post('work-orders/(:num)/complete-full', 'WorkOrdersController::completeFull/$1');
