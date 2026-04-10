<?php
// Analytics Routes - Updated for Modular Structure
$routes->group('api/v1/analytics', ['namespace' => 'App\Controllers\Api\V1\Modules\Core'], function($routes) {
    $routes->get('asset-health', 'AnalyticsController::assetHealth');
    $routes->get('asset-health/(:num)', 'AnalyticsController::assetHealth/$1');
    $routes->get('backlog-aging', 'AnalyticsController::backlogAging');
    $routes->get('backlog-priority', 'AnalyticsController::backlogByPriority');
    $routes->get('technician-utilization', 'AnalyticsController::technicianUtilization');
    $routes->get('technician-utilization/(:num)', 'AnalyticsController::technicianUtilization/$1');
});
