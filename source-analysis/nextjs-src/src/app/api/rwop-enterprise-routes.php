<?php

// Mobile Sync API
$routes->group('api/v1/rwop/mobile', ['filter' => 'auth'], function($routes) {
    $routes->post('sync', 'Api\V1\RWOP\MobileController::syncAction');
    $routes->get('work-orders', 'Api\V1\RWOP\MobileController::getWorkOrders');
    $routes->post('work-orders/(:segment)/status', 'Api\V1\RWOP\MobileController::updateStatus/$1');
    $routes->post('work-orders/(:segment)/photo', 'Api\V1\RWOP\MobileController::uploadPhoto/$1');
});

// War Room API
$routes->group('api/v1/rwop/war-room', ['filter' => 'auth'], function($routes) {
    $routes->get('active-breakdowns', 'Api\V1\RWOP\WarRoomController::getActiveBreakdowns');
    $routes->get('summary-stats', 'Api\V1\RWOP\WarRoomController::getSummaryStats');
    $routes->post('update-status', 'Api\V1\RWOP\WarRoomController::updateWorkOrderStatus');
});

// Backlog Risk API
$routes->group('api/v1/analytics', ['filter' => 'auth'], function($routes) {
    $routes->get('backlog-risk', 'Api\V1\RWOP\BacklogRiskController::getBacklogRisk');
    $routes->get('plant-risk-index', 'Api\V1\RWOP\BacklogRiskController::getPlantRiskIndex');
    $routes->get('department-risks', 'Api\V1\RWOP\BacklogRiskController::getDepartmentRisks');
    $routes->post('risk-snapshots', 'Api\V1\RWOP\BacklogRiskController::storeSnapshot');
});

// Parts Reservation API
$routes->group('api/v1/parts', ['filter' => 'auth'], function($routes) {
    $routes->post('reservations', 'Api\V1\RWOP\PartsController::createReservation');
    $routes->post('reservations/(:segment)/issue', 'Api\V1\RWOP\PartsController::issueParts/$1');
    $routes->post('reservations/(:segment)/cancel', 'Api\V1\RWOP\PartsController::cancelReservation/$1');
    $routes->get('(:segment)/availability', 'Api\V1\RWOP\PartsController::checkAvailability/$1');
});

// Digital Sign-off API
$routes->group('api/v1/work-orders', ['filter' => 'auth'], function($routes) {
    $routes->post('sign-off-chain', 'Api\V1\RWOP\SignOffController::initializeChain');
    $routes->get('(:segment)/sign-off-chain', 'Api\V1\RWOP\SignOffController::getChain/$1');
    $routes->post('(:segment)/sign-off', 'Api\V1\RWOP\SignOffController::submitSignature/$1');
    $routes->get('(:segment)/completion-readiness', 'Api\V1\RWOP\SignOffController::checkReadiness/$1');
});

// Downtime Classification API
$routes->group('api/v1/downtime', ['filter' => 'auth'], function($routes) {
    $routes->get('reasons', 'Api\V1\RWOP\DowntimeController::getReasons');
    $routes->post('records', 'Api\V1\RWOP\DowntimeController::recordDowntime');
    $routes->get('assets/(:segment)/analysis', 'Api\V1\RWOP\DowntimeController::getAssetAnalysis/$1');
    $routes->get('kpis', 'Api\V1\RWOP\DowntimeController::getKPIs');
});

// Master Data Governance API
$routes->group('api/v1/master-data', ['filter' => 'auth'], function($routes) {
    $routes->get('assets/validate-code/(:segment)', 'Api\V1\Core\MasterDataController::validateAssetCode/$1');
    $routes->post('assets/validate', 'Api\V1\Core\MasterDataController::validateAsset');
    $routes->post('failure-codes/validate', 'Api\V1\Core\MasterDataController::validateFailureCode');
    $routes->post('parts/validate', 'Api\V1\Core\MasterDataController::validatePart');
    $routes->get('job-skill-requirements/(:segment)', 'Api\V1\Core\MasterDataController::getJobSkillRequirements/$1');
});

// Enterprise Configuration API
$routes->group('api/v1/company', ['filter' => 'auth'], function($routes) {
    $routes->get('profile', 'Api\V1\Core\CompanyController::getProfile');
    $routes->put('profile', 'Api\V1\Core\CompanyController::updateProfile');
    $routes->post('initialize-ghana', 'Api\V1\Core\CompanyController::initializeGhana');
    $routes->post('configure-plant', 'Api\V1\Core\CompanyController::configurePlant');
    $routes->get('deployment-config', 'Api\V1\Core\CompanyController::getDeploymentConfig');
    $routes->get('plants', 'Api\V1\Core\CompanyController::getPlants');
    $routes->get('roles', 'Api\V1\Core\CompanyController::getRoles');
});

// SLA Escalation API
$routes->group('api/v1/work-orders', ['filter' => 'auth'], function($routes) {
    $routes->get('(:segment)/sla-metrics', 'Api\V1\RWOP\SLAController::getSLAMetrics/$1');
    $routes->post('escalations', 'Api\V1\RWOP\SLAController::triggerEscalation');
    $routes->get('(:segment)/escalations', 'Api\V1\RWOP\SLAController::getEscalations/$1');
});

// State Machine API
$routes->group('api/v1/work-orders', ['filter' => 'auth'], function($routes) {
    $routes->post('(:segment)/transition', 'Api\V1\RWOP\StateMachineController::transitionState/$1');
    $routes->get('(:segment)/valid-transitions', 'Api\V1\RWOP\StateMachineController::getValidTransitions/$1');
});

// Enhanced Reporting API
$routes->group('api/v1/reports', ['filter' => 'auth'], function($routes) {
    $routes->get('top-failing-assets', 'Api\V1\RWOP\ReportsController::getTopFailingAssets');
    $routes->get('repeat-failures', 'Api\V1\RWOP\ReportsController::getRepeatFailures');
    $routes->get('downtime-cost-analysis', 'Api\V1\RWOP\ReportsController::getDowntimeCostAnalysis');
    $routes->get('asset-reliability', 'Api\V1\RWOP\ReportsController::getAssetReliability');
});