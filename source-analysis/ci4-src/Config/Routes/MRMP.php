<?php

/**
 * MRMP Module Routes
 * Standard Pattern: jwt → modulelicense → moduleactive
 */

$routes->group('api/v1/eam', ['namespace' => 'App\Controllers\Api\V1\Modules\MRMP', 'filter' => ['jwtauth', 'moduleactive']], function($routes) {
    
    // PM Templates & Schedules
    $routes->get('pm-templates', 'PmController::index');
    $routes->post('pm-templates', 'PmController::create');
    $routes->get('pm-templates/(:segment)', 'PmController::show/$1');
    $routes->put('pm-templates/(:segment)', 'PmController::update/$1');
    $routes->delete('pm-templates/(:segment)', 'PmController::delete/$1');
    
    // PM Scheduling
    $routes->post('pm-scheduler/run', 'PmController::runScheduler');
    $routes->get('pm-schedules', 'PmController::getSchedules');
    $routes->get('pm-work-orders', 'PmController::getWorkOrders');
    $routes->put('pm-work-orders/(:segment)', 'PmController::updateWorkOrder/$1');
    
    // Calibration Management
    $routes->get('calibrations', 'CalibrationController::index');
    $routes->post('calibrations', 'CalibrationController::create');
    $routes->get('calibrations/(:segment)', 'CalibrationController::show/$1');
    $routes->put('calibrations/(:segment)', 'CalibrationController::update/$1');
    $routes->get('calibrations/overdue', 'CalibrationController::overdue');
    
    // Meter Readings
    $routes->get('meters', 'MetersController::index');
    $routes->post('meters', 'MetersController::create');
    $routes->get('meters/(:segment)', 'MetersController::show/$1');
    $routes->post('meters/(:segment)/readings', 'MetersController::addReading/$1');
    $routes->get('meters/(:segment)/readings', 'MetersController::readings/$1');
    
    // Predictive Maintenance
    $routes->get('predictive/health/(:segment)', 'PredictiveController::calculateHealth/$1');
    $routes->get('predictive/anomalies/(:segment)', 'PredictiveController::detectAnomalies/$1');
    $routes->get('predictive/at-risk', 'PredictiveController::assetsAtRisk');
    $routes->post('predictive/run-all', 'PredictiveController::runPredictions');
    
    // IoT Integration
    $routes->get('iot/devices', 'IoTController::index');
    $routes->post('iot/devices', 'IoTController::create');
    $routes->get('iot/devices/(:segment)', 'IoTController::show/$1');
    $routes->put('iot/devices/(:segment)', 'IoTController::update/$1');
    $routes->get('iot/devices/(:segment)/metrics', 'IoTController::getMetrics/$1');
    
    // Analytics
    $routes->get('analytics/reliability', 'ReliabilityController::dashboard');
    $routes->get('analytics/mtbf', 'ReliabilityController::mtbf');
    $routes->get('analytics/mttr', 'ReliabilityController::mttr');
    
    // Ghana-specific Features
    $routes->get('seasonal-adjustments', 'SeasonalController::index');
    $routes->post('seasonal-adjustments', 'SeasonalController::create');
    $routes->get('generator-pm', 'GeneratorController::index');
    $routes->post('generator-pm', 'GeneratorController::create');
});
