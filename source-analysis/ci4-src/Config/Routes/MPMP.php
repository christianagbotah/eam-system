<?php

/**
 * MPMP Module Routes
 * Standard Pattern: jwtauth → modulelicense → moduleactive
 */

$routes->group('api/v1/eam', ['namespace' => 'App\Controllers\Api\V1\Modules\MPMP', 'filter' => ['jwtauth', 'moduleactive']], function($routes) {
    
    // Production Management
    $routes->get('production', 'ProductionController::index');
    $routes->post('production', 'ProductionController::create');
    $routes->get('production/(:segment)', 'ProductionController::show/$1');
    $routes->put('production/(:segment)', 'ProductionController::update/$1');
    
    // Production Runs
    $routes->get('production-runs', 'ProductionRunsController::index');
    $routes->post('production-runs', 'ProductionRunsController::create');
    $routes->get('production-runs/(:segment)', 'ProductionRunsController::show/$1');
    $routes->post('production-runs/(:segment)/surveys', 'ProductionRunsController::createSurvey/$1');
    $routes->get('production-runs/(:segment)/surveys', 'ProductionRunsController::getSurveys/$1');
    
    // Production Surveys
    $routes->get('production-surveys/daily', 'ProductionSurveyController::getDailySurveys');
    $routes->post('production-surveys/daily', 'ProductionSurveyController::createDailySurvey');
    $routes->put('production-surveys/daily/(:segment)', 'ProductionSurveyController::updateDailySurvey/$1');
    $routes->get('production-surveys/weekly', 'ProductionSurveyController::getWeeklySummary');
    $routes->get('production-surveys/work-centers', 'ProductionSurveyController::getWorkCenters');
    
    $routes->get('production-survey/daily', 'ProductionSurveyController::getDailySurveys');
    $routes->post('production-survey/daily', 'ProductionSurveyController::createDailySurvey');
    $routes->put('production-survey/daily/(:segment)', 'ProductionSurveyController::updateDailySurvey/$1');
    $routes->get('production-survey/weekly', 'ProductionSurveyController::getWeeklySummary');
    $routes->get('production-survey/work-centers', 'ProductionSurveyController::getWorkCenters');
    
    // OEE Dashboard
    $routes->get('oee/dashboard', 'OEEController::dashboard');
    $routes->get('oee/realtime/(:segment)', 'OEEController::realtime/$1');
    $routes->get('oee/trends', 'OEEController::trends');
    
    // Downtime Tracking
    $routes->get('downtime', 'DowntimeController::index');
    $routes->post('downtime', 'DowntimeController::create');
    $routes->get('downtime/(:segment)', 'DowntimeController::show/$1');
    $routes->put('downtime/(:segment)', 'DowntimeController::update/$1');
    $routes->get('downtime/pareto', 'DowntimeController::paretoAnalysis');
    
    // Quality Management
    $routes->get('quality/checks', 'QualityController::index');
    $routes->post('quality/checks', 'QualityController::create');
    $routes->get('quality/non-conformances', 'QualityController::getNonConformances');
    $routes->post('quality/non-conformances', 'QualityController::createNonConformance');
    
    // Energy Management
    $routes->get('energy/dashboard', 'EnergyController::dashboard');
    $routes->post('energy/record', 'EnergyController::recordConsumption');
    $routes->get('energy/asset/(:segment)', 'EnergyController::getAssetConsumption/$1');
    
    // Work Centers
    $routes->get('work-centers', 'WorkCenterController::index');
    $routes->post('work-centers', 'WorkCenterController::create');
    $routes->get('work-centers/(:segment)', 'WorkCenterController::show/$1');
    $routes->put('work-centers/(:segment)', 'WorkCenterController::update/$1');
    
    // Analytics
    $routes->get('analytics/production', 'ProductionAnalyticsController::dashboard');
    $routes->get('analytics/efficiency', 'ProductionAnalyticsController::efficiency');
});
