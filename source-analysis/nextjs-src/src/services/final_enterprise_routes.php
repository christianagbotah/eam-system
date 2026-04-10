<?php

// ENTERPRISE API ROUTES - COMPLETE BACKEND IMPLEMENTATION
// Add these routes to your CodeIgniter routes configuration

// ========================================
// HIERARCHY MANAGEMENT
// ========================================
$routes->group('api/v1/hierarchy', function($routes) {
    // Facilities
    $routes->get('facilities', 'HierarchyController::facilities');
    $routes->post('facilities', 'HierarchyController::createFacility');
    $routes->put('facilities/(:num)', 'HierarchyController::updateFacility/$1');
    $routes->delete('facilities/(:num)', 'HierarchyController::deleteFacility/$1');
    
    // Areas
    $routes->get('facilities/(:num)/areas', 'HierarchyController::areas/$1');
    $routes->post('facilities/(:num)/areas', 'HierarchyController::createArea/$1');
    $routes->put('areas/(:num)', 'HierarchyController::updateArea/$1');
    $routes->delete('areas/(:num)', 'HierarchyController::deleteArea/$1');
    
    // Production Lines
    $routes->get('areas/(:num)/lines', 'HierarchyController::lines/$1');
    $routes->post('areas/(:num)/lines', 'HierarchyController::createLine/$1');
    $routes->put('lines/(:num)', 'HierarchyController::updateLine/$1');
    $routes->delete('lines/(:num)', 'HierarchyController::deleteLine/$1');
    
    // Hierarchy Tree
    $routes->get('tree', 'HierarchyController::hierarchyTree');
    $routes->get('validate-asset-code/(:segment)', 'HierarchyController::validateAssetCode/$1');
});

// ========================================
// ENHANCED ASSETS
// ========================================
$routes->group('api/v1/assets', function($routes) {
    $routes->get('/', 'AssetController::index');
    $routes->post('/', 'AssetController::create');
    $routes->get('(:num)', 'AssetController::show/$1');
    $routes->put('(:num)', 'AssetController::update/$1');
    $routes->delete('(:num)', 'AssetController::delete/$1');
    
    // Hierarchy-based queries
    $routes->get('facility/(:num)', 'AssetController::byFacility/$1');
    $routes->get('area/(:num)', 'AssetController::byArea/$1');
    $routes->get('line/(:num)', 'AssetController::byLine/$1');
    $routes->get('criticality/(:segment)', 'AssetController::byCriticality/$1');
    
    // Asset health and performance
    $routes->get('health-summary', 'AssetController::healthSummary');
    $routes->get('(:num)/performance', 'AssetController::performance/$1');
    $routes->get('(:num)/maintenance-history', 'AssetController::maintenanceHistory/$1');
});

// ========================================
// ENHANCED WORK ORDERS
// ========================================
$routes->group('api/v1/work-orders', function($routes) {
    $routes->get('/', 'WorkOrderController::index');
    $routes->post('/', 'WorkOrderController::create');
    $routes->get('(:num)', 'WorkOrderController::show/$1');
    $routes->put('(:num)', 'WorkOrderController::update/$1');
    $routes->delete('(:num)', 'WorkOrderController::delete/$1');
    
    // Cost management
    $routes->post('(:num)/calculate-costs', 'WorkOrderController::calculateCosts/$1');
    $routes->get('(:num)/cost-breakdown', 'WorkOrderController::costBreakdown/$1');
    
    // Locking mechanism
    $routes->post('(:num)/lock', 'WorkOrderController::lock/$1');
    $routes->post('(:num)/unlock', 'WorkOrderController::unlock/$1');
    $routes->get('locked', 'WorkOrderController::lockedOrders');
    
    // Status and workflow
    $routes->post('(:num)/complete', 'WorkOrderController::complete/$1');
    $routes->post('(:num)/approve', 'WorkOrderController::approve/$1');
    $routes->get('overdue', 'WorkOrderController::overdueOrders');
});

// ========================================
// RBAC SYSTEM
// ========================================
$routes->group('api/v1/rbac', function($routes) {
    // Roles
    $routes->get('roles', 'RBACController::roles');
    $routes->post('roles', 'RBACController::createRole');
    $routes->put('roles/(:num)', 'RBACController::updateRole/$1');
    $routes->delete('roles/(:num)', 'RBACController::deleteRole/$1');
    
    // Permissions
    $routes->get('permissions', 'RBACController::permissions');
    $routes->post('permissions', 'RBACController::createPermission');
    $routes->get('roles/(:num)/permissions', 'RBACController::rolePermissions/$1');
    $routes->post('roles/(:num)/permissions', 'RBACController::assignPermissions/$1');
    
    // User roles
    $routes->get('users/(:num)/roles', 'RBACController::userRoles/$1');
    $routes->post('users/(:num)/roles', 'RBACController::assignUserRole/$1');
    $routes->delete('user-roles/(:num)', 'RBACController::removeUserRole/$1');
    
    // Permission checks
    $routes->post('check-permission', 'RBACController::checkPermission');
    $routes->get('user-permissions/(:num)', 'RBACController::userPermissions/$1');
});

// ========================================
// FINANCIAL MANAGEMENT
// ========================================
$routes->group('api/v1/financial', function($routes) {
    // Financial periods
    $routes->get('periods', 'FinancialController::periods');
    $routes->post('periods', 'FinancialController::createPeriod');
    $routes->post('periods/(:num)/lock', 'FinancialController::lockPeriod/$1');
    $routes->post('periods/(:num)/unlock', 'FinancialController::unlockPeriod/$1');
    
    // Cost reporting
    $routes->get('cost-summary', 'FinancialController::costSummary');
    $routes->get('cost-breakdown', 'FinancialController::costBreakdown');
    $routes->get('budget-variance', 'FinancialController::budgetVariance');
    
    // Cost centers
    $routes->get('cost-centers', 'FinancialController::costCenters');
    $routes->post('cost-centers', 'FinancialController::createCostCenter');
});

// ========================================
// AUDIT & COMPLIANCE
// ========================================
$routes->group('api/v1/audit', function($routes) {
    $routes->get('logs', 'AuditController::logs');
    $routes->post('log-activity', 'AuditController::logActivity');
    $routes->get('compliance-report', 'AuditController::complianceReport');
    $routes->get('user-activity/(:num)', 'AuditController::userActivity/$1');
    $routes->get('table-changes/(:segment)', 'AuditController::tableChanges/$1');
});

// ========================================
// COMPANY SETUP
// ========================================
$routes->group('api/v1/setup', function($routes) {
    $routes->get('check', 'SetupController::checkSetup');
    $routes->post('initialize', 'SetupController::initializeCompany');
    $routes->get('industry-defaults/(:segment)', 'SetupController::getIndustryDefaults/$1');
    $routes->post('complete-setup', 'SetupController::completeSetup');
});

// ========================================
// COMPANY MANAGEMENT
// ========================================
$routes->group('api/v1/company', function($routes) {
    $routes->get('settings', 'CompanyController::settings');
    $routes->put('settings', 'CompanyController::updateSettings');
    $routes->get('profile', 'CompanyController::profile');
    $routes->put('profile', 'CompanyController::updateProfile');
});

// ========================================
// DASHBOARD & ANALYTICS
// ========================================
$routes->group('api/v1/dashboard', function($routes) {
    $routes->get('executive-metrics', 'DashboardController::executiveMetrics');
    $routes->get('kpi-summary', 'DashboardController::kpiSummary');
    $routes->get('performance-trends', 'DashboardController::performanceTrends');
    $routes->get('asset-utilization', 'DashboardController::assetUtilization');
    $routes->get('maintenance-backlog', 'DashboardController::maintenanceBacklog');
});

// ========================================
// CONFIGURATION
// ========================================
$routes->group('api/v1/config', function($routes) {
    // SLA Templates
    $routes->get('sla-templates', 'ConfigController::slaTemplates');
    $routes->post('sla-templates', 'ConfigController::createSlaTemplate');
    
    // Shift Definitions
    $routes->get('shifts', 'ConfigController::shifts');
    $routes->post('shifts', 'ConfigController::createShift');
    
    // Downtime Categories
    $routes->get('downtime-categories', 'ConfigController::downtimeCategories');
    $routes->post('downtime-categories', 'ConfigController::createDowntimeCategory');
});

// ========================================
// SYSTEM HEALTH
// ========================================
$routes->group('api/v1/system', function($routes) {
    $routes->get('health', 'SystemController::health');
    $routes->get('version', 'SystemController::version');
    $routes->get('database-status', 'SystemController::databaseStatus');
    $routes->get('performance-metrics', 'SystemController::performanceMetrics');
});

?>