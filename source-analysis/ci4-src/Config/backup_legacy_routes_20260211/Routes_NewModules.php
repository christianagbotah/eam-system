<?php
// Module Settings
$routes->group('api/v1', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    $routes->get('modules', 'ModuleController::index');
    $routes->put('modules/(:num)/toggle', 'ModuleController::toggle/$1');
    $routes->put('modules/(:num)/settings', 'ModuleController::updateSettings/$1');
    $routes->post('modules/seed', 'ModuleController::seedModules');
});

// MODULE 2: Work Execution
$routes->group('api/v1/work-executions', ['namespace' => 'App\Controllers\Api\V1\WorkExecution'], function($routes) {
    $routes->get('', 'WorkExecutionController::index');
    $routes->get('(:num)', 'WorkExecutionController::show/$1');
    $routes->post('', 'WorkExecutionController::create');
    $routes->put('(:num)', 'WorkExecutionController::update/$1');
    $routes->post('start', 'WorkExecutionController::start');
    $routes->post('(:num)/pause', 'WorkExecutionController::pause/$1');
    $routes->post('(:num)/resume', 'WorkExecutionController::resume/$1');
    $routes->post('(:num)/complete', 'WorkExecutionController::complete/$1');
});

// MODULE 3: Operator Checklists
$routes->group('api/v1/checklists', ['namespace' => 'App\Controllers\Api\V1\Checklists'], function($routes) {
    $routes->get('templates', 'ChecklistController::templates');
    $routes->post('templates', 'ChecklistController::createTemplate');
    $routes->get('', 'ChecklistController::index');
    $routes->post('', 'ChecklistController::create');
    $routes->get('(:num)', 'ChecklistController::show/$1');
});

// MODULE 4: Shift Handovers
$routes->group('api/v1/shift/handovers', ['namespace' => 'App\Controllers\Api\V1\Shift'], function($routes) {
    $routes->get('', 'ShiftHandoverController::index');
    $routes->post('', 'ShiftHandoverController::create');
    $routes->get('pending', 'ShiftHandoverController::pending');
    $routes->get('(:num)', 'ShiftHandoverController::show/$1');
    $routes->post('(:num)/accept', 'ShiftHandoverController::accept/$1');
    $routes->post('(:num)/reject', 'ShiftHandoverController::reject/$1');
});

// MODULE 5: Risk Assessments
$routes->group('api/v1/risk/assessments', ['namespace' => 'App\Controllers\Api\V1\Risk'], function($routes) {
    $routes->get('', 'RiskAssessmentController::index');
    $routes->post('', 'RiskAssessmentController::create');
    $routes->get('(:num)', 'RiskAssessmentController::show/$1');
    $routes->put('(:num)', 'RiskAssessmentController::update/$1');
    $routes->post('(:num)/approve', 'RiskAssessmentController::approve/$1');
    $routes->post('(:num)/measures', 'RiskAssessmentController::addMeasure/$1');
});
