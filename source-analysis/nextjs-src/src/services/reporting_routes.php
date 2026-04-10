// Reporting & Analytics Routes
$routes->group('api/v1/eam', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Dashboard Widgets
    $routes->get('dashboard/widgets/(:segment)', 'ReportingController::getDashboardWidget/$1');
    
    // Reports
    $routes->get('reports/generate', 'ReportingController::generateReport');
    $routes->get('reports/definitions', 'ReportingController::getReportDefinitions');
    
    // Analytics
    $routes->get('analytics/financial-summary', 'ReportingController::getFinancialSummary');
    $routes->get('analytics/sla-performance', 'ReportingController::getSLAPerformance');
    $routes->get('analytics/asset-reliability', 'ReportingController::getAssetReliability');
    $routes->get('analytics/asset-reliability/(:num)', 'ReportingController::getAssetReliability/$1');
    $routes->get('analytics/downtime-cost', 'ReportingController::getDowntimeCostAnalysis');
    
    // Cost Calculation
    $routes->post('costs/calculate/(:segment)', 'ReportingController::calculateWorkOrderCosts/$1');
    $routes->get('costs/breakdown/(:segment)', 'ReportingController::getCostBreakdown/$1');
    
    // Maintenance Cost Management
    $routes->resource('cost-entries', ['controller' => 'MaintenanceCostController']);
    $routes->resource('technician-rates', ['controller' => 'TechnicianRateController']);
    $routes->resource('cost-centers', ['controller' => 'CostCenterController']);
});

// Additional specific routes for advanced features
$routes->group('api/v1/analytics', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Executive Dashboard
    $routes->get('dashboard/executive', 'ReportingController::getExecutiveDashboard');
    $routes->get('dashboard/maintenance-command', 'ReportingController::getMaintenanceCommand');
    $routes->get('dashboard/financial-intelligence', 'ReportingController::getFinancialIntelligence');
    
    // Report Scheduling
    $routes->resource('scheduled-reports', ['controller' => 'ScheduledReportController']);
    
    // System Performance
    $routes->get('performance/metrics', 'ReportingController::getPerformanceMetrics');
    $routes->get('performance/plant-risk', 'ReportingController::getPlantRiskIndex');
});