<?php

/**
 * Core Module Routes
 * Platform Services - Ghana Industrial EAM
 */

// Parts & Tools - Universal access with JWT only (for work order creation)
$routes->group('api/v1/eam', ['filter' => 'jwtauth'], function($routes) {
    $routes->get('parts', '\App\Controllers\Api\V1\Modules\IMS\PartsController::index');
    $routes->get('tools', '\App\Controllers\Api\V1\Modules\TRAC\ToolsController::index');
});

// Core platform routes (no module filter - always available)
$routes->group('api/v1/eam', ['namespace' => 'App\Controllers\Api\V1\Modules\Core'], function($routes) {
    
    // Global Module Management (Single-Company, Multi-Plant)
    $routes->post('modules/unlock-all', 'GlobalModuleController::unlockAll');
    $routes->post('modules/(:segment)/lock', 'GlobalModuleController::lock/$1');
    $routes->post('modules/(:segment)/unlock', 'GlobalModuleController::unlock/$1');
    $routes->post('modules/(:segment)/license', 'GlobalModuleController::license/$1');
    $routes->post('modules/(:segment)/unlicense', 'GlobalModuleController::unlicense/$1');
    $routes->post('modules/(:segment)/enable', 'GlobalModuleController::enable/$1');
    $routes->post('modules/(:segment)/disable', 'GlobalModuleController::disable/$1');
    $routes->get('modules/logs/(:num)', 'GlobalModuleController::logs/$1');
    $routes->get('modules/logs', 'GlobalModuleController::logs');
    $routes->get('modules/active', 'GlobalModuleController::active');
    $routes->get('modules', 'GlobalModuleController::index');
    
    // Authentication
    $routes->post('auth/login', 'AuthController::login');
    $routes->post('auth/logout', 'AuthController::logout');
    $routes->post('auth/refresh', 'AuthController::refresh');
    $routes->post('auth/forgot-password', 'AuthController::forgotPassword');
    $routes->post('auth/reset-password', 'AuthController::resetPassword');
    
    // Plant Management
    $routes->get('plants', 'PlantController::index');
    $routes->post('plants', 'PlantController::create');
    $routes->get('plants/user/plants', 'PlantController::getUserPlants');
    $routes->post('plants/user/switch-plant', 'PlantController::switchPlant');
    $routes->get('plants/user/switch-plant', 'PlantController::switchPlant');
    $routes->post('plants/assign-user', 'PlantController::assignUser');
    
    // Health Check
    $routes->get('health', 'HealthController::index');
    $routes->get('system/health', 'SystemHealthController::index');
    
    // Dashboard
    $routes->get('dashboard/stats', 'DashboardController::stats');
    $routes->get('dashboard/unified', 'DashboardController::unified');
    $routes->get('dashboard/admin', 'DashboardController::admin');
    $routes->get('dashboard/supervisor', 'DashboardController::supervisor');
    $routes->get('dashboard/planner', 'DashboardController::planner');
    $routes->get('dashboard/technician', 'DashboardController::technician');
    $routes->get('dashboard/operator', 'DashboardController::operator');
    
    // Common lookups (no module filter needed) - moved outside group
    
    // Digital Twin
    $routes->get('digital-twin/metrics', 'DigitalTwinController::metrics');
    
    // RBAC & Permissions - Comprehensive Management
    $routes->group('rbac', function($routes) {
        // Roles
        $routes->get('roles', 'RBACController::getRoles');
        $routes->get('roles/(:num)', 'RBACController::getRole/$1');
        $routes->post('roles', 'RBACController::createRole');
        $routes->put('roles/(:num)', 'RBACController::updateRole/$1');
        $routes->delete('roles/(:num)', 'RBACController::deleteRole/$1');
        $routes->post('roles/(:num)/permissions', 'RBACController::assignPermissions/$1');
        
        // Permissions
        $routes->get('permissions', 'PermissionsController::index');
        $routes->get('permissions/(:num)', 'PermissionsController::show/$1');
        $routes->post('permissions', 'PermissionsController::create');
        $routes->put('permissions/(:num)', 'PermissionsController::update/$1');
        $routes->delete('permissions/(:num)', 'PermissionsController::delete/$1');
        
        // User Permissions
        $routes->get('users/(:num)/permissions', 'RBACController::getUserPermissions/$1');
        $routes->post('users/assign-role', 'RBACController::assignRoleToUser');
        $routes->delete('users/remove-role', 'RBACController::removeRoleFromUser');
        
        // Permission Matrix
        $routes->get('matrix', 'RBACController::getPermissionMatrix');
    });
    
    // Legacy RBAC routes (backward compatibility)
    $routes->get('roles', 'RolesController::index');
    $routes->post('roles', 'RolesController::create');
    $routes->get('roles/(:segment)', 'RolesController::show/$1');
    $routes->put('roles/(:segment)', 'RolesController::update/$1');
    $routes->delete('roles/(:segment)', 'RolesController::delete/$1');
    $routes->post('roles/(:segment)/assign-permissions', 'RolesController::assignPermissions/$1');
    
    $routes->get('permissions', 'PermissionsController::index');
    $routes->get('users/(:segment)/permissions', 'RBACController::getUserPermissions/$1');
    
    // Audit Logs
    $routes->get('audit-logs', 'AuditLogsController::index');
    $routes->get('audit-logs/(:segment)', 'AuditLogsController::show/$1');
    
    // Notifications
    $routes->get('notifications', 'NotificationsController::index');
    $routes->put('notifications/(:segment)/read', 'NotificationsController::markAsRead/$1');
    $routes->put('notifications/mark-all-read', 'NotificationsController::markAllAsRead');
    $routes->delete('notifications/(:segment)', 'NotificationsController::delete/$1');
    
    // System Settings
    $routes->get('settings/system', 'SystemSettingsController::index');
    $routes->put('settings/system', 'SystemSettingsController::update');
    $routes->get('settings/theme', 'SystemSettingsController::theme');
    $routes->get('settings/company', 'SystemSettingsController::company');
    $routes->put('settings/company', 'SystemSettingsController::update');
    
    // Documents
    $routes->get('documents', 'DocumentsController::index');
    $routes->post('documents/upload', 'DocumentsController::upload');
    $routes->get('documents/(:segment)', 'DocumentsController::show/$1');
    $routes->get('documents/(:segment)/download', 'DocumentsController::download/$1');
    $routes->post('documents/(:segment)/version', 'DocumentsController::newVersion/$1');
    
    // Attachments
    $routes->post('attachments/upload', 'AttachmentsController::upload');
    $routes->get('attachments/(:segment)/download', 'AttachmentsController::download/$1');
    $routes->delete('attachments/(:segment)', 'AttachmentsController::delete/$1');
    
    // Reports
    $routes->get('reports', 'ReportsController::index');
    $routes->post('reports/generate', 'ReportsController::generate');
    $routes->post('reports/schedule', 'ReportsController::schedule');
    $routes->get('reports/scheduled', 'ReportsController::getScheduled');
    
    // Search
    $routes->get('search/global', 'SearchController::global');
    $routes->post('search/advanced', 'SearchController::advanced');
    
    // Bulk Operations
    $routes->post('bulk/update-assets', 'BulkOperationsController::updateAssets');
    $routes->post('bulk/create-work-orders', 'BulkOperationsController::createWorkOrders');
    $routes->post('bulk/delete', 'BulkOperationsController::deleteMultiple');
    
    // Cache Management
    $routes->post('cache/clear', 'CacheController::clear');
    $routes->get('cache/stats', 'CacheController::stats');
    
    // API Management
    $routes->get('api-keys', 'APIManagementController::index');
    $routes->post('api-keys', 'APIManagementController::create');
    $routes->delete('api-keys/(:segment)', 'APIManagementController::revoke/$1');
    
    // AI Assistant
    $routes->post('ai/query', 'AIController::query');
    $routes->get('ai/recommendations', 'AIController::recommendations');
    
    // Mobile Support
    $routes->post('mobile/sync', 'MobileController::syncOfflineData');
    $routes->post('mobile/push-token', 'MobileController::registerPushToken');
    
    // Assets Unified (for dashboard - no module filter)
    $routes->get('assets-unified', 'AssetsUnifiedController::index');
});

// Analytics Routes (separate namespace for backward compatibility)
$routes->group('api/v1/eam/analytics', ['namespace' => 'App\Controllers\Api\V1\Modules\REPORTS'], function($routes) {
    $routes->get('kpis', 'AnalyticsController::kpis');
    $routes->get('department-metrics', 'AnalyticsController::departmentMetrics');
    $routes->get('asset-health/(:segment)', 'AnalyticsController::assetHealth/$1');
    $routes->get('backlog-aging', 'AnalyticsController::backlogAging');
    $routes->get('backlog-priority', 'AnalyticsController::backlogByPriority');
    $routes->get('technician-utilization/(:segment)', 'AnalyticsController::technicianUtilization/$1');
});
