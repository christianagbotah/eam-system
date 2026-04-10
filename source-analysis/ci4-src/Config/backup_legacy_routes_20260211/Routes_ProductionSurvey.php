<?php

// Production Survey Routes
$routes->group('api/v1/production-surveys', ['namespace' => 'App\Controllers\Api\V1\ProductionSurvey'], function($routes) {
    $routes->get('/', 'ProductionSurveyController::index');
    $routes->get('kpis', 'ProductionSurveyController::kpis');
    $routes->get('(:num)', 'ProductionSurveyController::show/$1');
    $routes->post('/', 'ProductionSurveyController::create');
    $routes->put('(:num)', 'ProductionSurveyController::update/$1');
    $routes->delete('(:num)', 'ProductionSurveyController::delete/$1');
    $routes->post('(:num)/submit', 'ProductionSurveyController::submit/$1');
    $routes->post('(:num)/approve', 'ProductionSurveyController::approve/$1');
    $routes->post('(:num)/reject', 'ProductionSurveyController::reject/$1');
    
    // Attachments
    $routes->get('(:num)/attachments', 'AttachmentController::index/$1');
    $routes->post('(:num)/attachments', 'AttachmentController::upload/$1');
    $routes->delete('attachments/(:num)', 'AttachmentController::delete/$1');
    
    // Shift Handover
    $routes->post('(:num)/handover', 'ShiftHandoverController::create/$1');
    $routes->get('(:num)/handover', 'ShiftHandoverController::get/$1');
    $routes->post('handover/(:num)/acknowledge', 'ShiftHandoverController::acknowledge/$1');
    
    // Alerts
    $routes->get('alerts', 'AlertController::getAlerts');
    $routes->get('alert-rules', 'AlertController::getRules');
    $routes->post('alert-rules', 'AlertController::createRule');
    $routes->post('alerts/(:num)/acknowledge', 'AlertController::acknowledgeAlert/$1');
});
