<?php

// Enterprise EAM API Routes - Add to existing routes configuration

// Hierarchy Management Routes
$routes->group('api/v1/hierarchy', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Facility hierarchy
    $routes->get('facilities', 'HierarchyController::getFacilities');
    $routes->get('facilities/(:num)/areas', 'HierarchyController::getFacilityAreas/$1');
    $routes->get('areas/(:num)/lines', 'HierarchyController::getAreaLines/$1');
    $routes->get('tree', 'HierarchyController::getHierarchyTree');
    
    // Create hierarchy elements
    $routes->post('areas', 'HierarchyController::createArea');
    $routes->post('lines', 'HierarchyController::createLine');
    
    // Asset naming validation
    $routes->post('validate-asset-name', 'HierarchyController::validateAssetName');
});

// Enhanced Asset Management Routes
$routes->group('api/v1/assets', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Asset CRUD with hierarchy
    $routes->get('', 'AssetController::index');
    $routes->get('(:num)', 'AssetController::show/$1');
    $routes->post('', 'AssetController::create');
    $routes->put('(:num)', 'AssetController::update/$1');
    $routes->delete('(:num)', 'AssetController::delete/$1');
    
    // Hierarchy-specific endpoints
    $routes->get('facility/(:num)', 'AssetController::getByFacility/$1');
    $routes->get('area/(:num)', 'AssetController::getByArea/$1');
    $routes->get('line/(:num)', 'AssetController::getByLine/$1');
    $routes->get('criticality/(:segment)', 'AssetController::getByCriticality/$1');
    
    // Asset hierarchy info
    $routes->get('(:num)/hierarchy', 'AssetController::getHierarchy/$1');
});

// Enhanced Work Order Routes
$routes->group('api/v1/work-orders', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Standard CRUD
    $routes->get('', 'WorkOrderController::index');
    $routes->get('(:segment)', 'WorkOrderController::show/$1');
    $routes->post('', 'WorkOrderController::create');
    $routes->put('(:segment)', 'WorkOrderController::update/$1');
    $routes->delete('(:segment)', 'WorkOrderController::delete/$1');
    
    // Enterprise features
    $routes->get('(:segment)/can-edit', 'WorkOrderController::canEdit/$1');
    $routes->post('(:segment)/lock', 'WorkOrderController::lock/$1');
    $routes->post('(:segment)/unlock', 'WorkOrderController::unlock/$1');
    
    // Filtering and reporting
    $routes->get('facility/(:num)', 'WorkOrderController::getByFacility/$1');
    $routes->get('overdue', 'WorkOrderController::getOverdue');
    $routes->get('locked', 'WorkOrderController::getLocked');
    
    // Cost management
    $routes->get('(:segment)/costs', 'WorkOrderController::getCosts/$1');
    $routes->post('(:segment)/calculate-costs', 'WorkOrderController::calculateCosts/$1');
});

// Company Settings & Setup Routes
$routes->group('api/v1/company', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Company profile
    $routes->get('profile', 'CompanyController::getProfile');
    $routes->put('profile', 'CompanyController::updateProfile');
    
    // Setup wizard
    $routes->get('setup/status', 'CompanyController::getSetupStatus');
    $routes->post('setup/profile', 'CompanyController::setupProfile');
    $routes->post('setup/hierarchy', 'CompanyController::setupHierarchy');
    $routes->post('setup/shifts', 'CompanyController::setupShifts');
    $routes->post('setup/complete', 'CompanyController::completeSetup');
});

// RBAC Management Routes
$routes->group('api/v1/rbac', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Roles
    $routes->get('roles', 'RBACController::getRoles');
    $routes->post('roles', 'RBACController::createRole');
    $routes->put('roles/(:num)', 'RBACController::updateRole/$1');
    
    // Permissions
    $routes->get('permissions', 'RBACController::getPermissions');
    $routes->get('permissions/modules', 'RBACController::getPermissionsByModule');
    
    // User role assignments
    $routes->get('users/(:num)/roles', 'RBACController::getUserRoles/$1');
    $routes->post('users/(:num)/roles', 'RBACController::assignRole/$1');
    $routes->delete('users/(:num)/roles/(:num)', 'RBACController::revokeRole/$1/$2');
    
    // Permission checks
    $routes->post('check-permission', 'RBACController::checkPermission');
    $routes->get('users/(:num)/permissions', 'RBACController::getUserPermissions/$1');
    
    // Permission overrides
    $routes->post('users/(:num)/override', 'RBACController::grantOverride/$1');
    $routes->get('overrides/active', 'RBACController::getActiveOverrides');
});

// Financial Governance Routes
$routes->group('api/v1/finance', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Financial periods
    $routes->get('periods', 'FinanceController::getPeriods');
    $routes->post('periods/(:num)/(:num)/lock', 'FinanceController::lockPeriod/$1/$2');
    $routes->post('periods/(:num)/(:num)/unlock', 'FinanceController::unlockPeriod/$1/$2');
    $routes->get('periods/locked', 'FinanceController::getLockedPeriods');
    
    // Cost management
    $routes->post('costs/validate', 'FinanceController::validateCost');
    $routes->get('summary/(:num)', 'FinanceController::getFinancialSummary/$1');
    $routes->get('summary/(:num)/(:num)', 'FinanceController::getFinancialSummary/$1/$2');
    
    // Auto-lock functionality
    $routes->post('auto-lock', 'FinanceController::autoLockPeriods');
});

// Cost Center Management Routes
$routes->group('api/v1/cost-centers', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    $routes->get('', 'CostCenterController::index');
    $routes->get('(:num)', 'CostCenterController::show/$1');
    $routes->post('', 'CostCenterController::create');
    $routes->put('(:num)', 'CostCenterController::update/$1');
    $routes->delete('(:num)', 'CostCenterController::delete/$1');
    
    // Budget tracking
    $routes->get('(:num)/budget-status', 'CostCenterController::getBudgetStatus/$1');
    $routes->get('budget-summary', 'CostCenterController::getBudgetSummary');
});

// SLA Template Management Routes
$routes->group('api/v1/sla-templates', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    $routes->get('', 'SLATemplateController::index');
    $routes->get('(:num)', 'SLATemplateController::show/$1');
    $routes->post('', 'SLATemplateController::create');
    $routes->put('(:num)', 'SLATemplateController::update/$1');
    $routes->delete('(:num)', 'SLATemplateController::delete/$1');
    
    // Get templates by priority
    $routes->get('priority/(:segment)', 'SLATemplateController::getByPriority/$1');
    $routes->get('defaults', 'SLATemplateController::getDefaults');
});

// Shift Management Routes
$routes->group('api/v1/shifts', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    $routes->get('', 'ShiftController::index');
    $routes->get('(:num)', 'ShiftController::show/$1');
    $routes->post('', 'ShiftController::create');
    $routes->put('(:num)', 'ShiftController::update/$1');
    $routes->delete('(:num)', 'ShiftController::delete/$1');
    
    // Current shift info
    $routes->get('current', 'ShiftController::getCurrentShift');
    $routes->get('schedule/(:segment)', 'ShiftController::getSchedule/$1');
});

// Audit Log Routes
$routes->group('api/v1/audit', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    $routes->get('logs', 'AuditController::getLogs');
    $routes->get('logs/table/(:segment)', 'AuditController::getLogsByTable/$1');
    $routes->get('logs/user/(:num)', 'AuditController::getLogsByUser/$1');
    $routes->get('logs/(:segment)', 'AuditController::getLog/$1');
    
    // Integrity checks
    $routes->post('verify-integrity', 'AuditController::verifyIntegrity');
    $routes->get('integrity-status', 'AuditController::getIntegrityStatus');
});

// System Health & Deployment Routes
$routes->group('api/v1/system', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Health checks
    $routes->get('health', 'SystemController::healthCheck');
    $routes->get('health/database', 'SystemController::databaseHealth');
    $routes->get('health/filesystem', 'SystemController::filesystemHealth');
    $routes->get('health/services', 'SystemController::servicesHealth');
    
    // Installation status
    $routes->get('installation/status', 'SystemController::getInstallationStatus');
    $routes->get('installation/logs', 'SystemController::getInstallationLogs');
    
    // Configuration
    $routes->get('config', 'SystemController::getConfiguration');
    $routes->put('config', 'SystemController::updateConfiguration');
});

// Enhanced Reporting Routes (extends existing)
$routes->group('api/v1/reports', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Enterprise reports with hierarchy filtering
    $routes->get('work-orders/facility/(:num)', 'ReportController::getWorkOrdersByFacility/$1');
    $routes->get('costs/facility/(:num)', 'ReportController::getCostsByFacility/$1');
    $routes->get('sla/facility/(:num)', 'ReportController::getSLAByFacility/$1');
    
    // Executive reports
    $routes->get('executive/summary', 'ReportController::getExecutiveSummary');
    $routes->get('executive/kpis', 'ReportController::getExecutiveKPIs');
    
    // Financial reports
    $routes->get('financial/summary/(:num)', 'ReportController::getFinancialSummary/$1');
    $routes->get('financial/cost-centers', 'ReportController::getCostCenterReport');
});