<?php

/**
 * REPORTS Module Routes
 * Standard Pattern: jwt → modulelicense → moduleactive
 */

$routes->group('api/v1/eam', ['filter' => 'jwt|moduleactive'], function($routes) {
    // Reports
    $routes->resource('reports', ['controller' => 'Api\V1\Modules\REPORTS\ReportsController']);
    $routes->get('reports/generate/(:segment)', 'Api\V1\Modules\REPORTS\ReportsController::generate/$1');
    $routes->post('reports/export', 'Api\V1\Modules\REPORTS\ReportsController::export');
    
    // Analytics
    $routes->get('analytics', 'Api\V1\Modules\REPORTS\AnalyticsController::index');
    $routes->get('analytics/dashboard', 'Api\V1\Modules\REPORTS\AnalyticsController::dashboard');
    $routes->get('analytics/kpis', 'Api\V1\Modules\REPORTS\AnalyticsController::kpis');
    $routes->get('analytics/assets/(:segment)/kpis', 'AnalyticsController::getAssetKPIs/$1');
    $routes->get('analytics/departments', 'Api\V1\Modules\REPORTS\AnalyticsController::getDepartmentMetrics');
    $routes->get('analytics/maintenance-costs', 'Api\V1\Modules\REPORTS\AnalyticsController::getMaintenanceCosts');
    $routes->get('analytics/downtime', 'Api\V1\Modules\REPORTS\AnalyticsController::getDowntimeAnalysis');
    
    // Module-Specific Reports
    $routes->get('reports/work-orders', 'Api\V1\Modules\REPORTS\WorkOrderReportsController::index');
    $routes->get('reports/production', 'Api\V1\Modules\REPORTS\ProductionReportsController::index');
    $routes->get('reports/stock', 'Api\V1\Modules\REPORTS\StockReportsController::index');
});
