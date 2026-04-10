<?php

// Mobile Work Order Routes
$routes->group('api/mobile-wo', ['namespace' => 'App\Controllers\API'], function($routes) {
    $routes->get('my-work-orders', 'MobileWorkOrderController::myWorkOrders');
    $routes->get('details/(:num)', 'MobileWorkOrderController::getWorkOrderDetails/$1');
    $routes->post('start', 'MobileWorkOrderController::startWork');
    $routes->post('complete', 'MobileWorkOrderController::completeWork');
    $routes->post('upload-photo', 'MobileWorkOrderController::uploadPhoto');
    $routes->post('log-time', 'MobileWorkOrderController::logTime');
    $routes->post('record-part', 'MobileWorkOrderController::recordPartUsage');
    $routes->post('sync', 'MobileWorkOrderController::syncOfflineData');
});

// Condition Monitoring Routes
$routes->group('api/condition-monitoring', ['namespace' => 'App\Controllers\API'], function($routes) {
    $routes->get('/', 'ConditionMonitoringController::index');
    $routes->post('/', 'ConditionMonitoringController::create');
    $routes->get('trends/(:num)', 'ConditionMonitoringController::trends/$1');
    $routes->get('alerts', 'ConditionMonitoringController::alerts');
    $routes->get('statistics', 'ConditionMonitoringController::statistics');
});

// RCA Routes (if not already added)
$routes->group('api/rca', ['namespace' => 'App\Controllers\API'], function($routes) {
    $routes->get('/', 'RCAController::index');
    $routes->post('/', 'RCAController::create');
    $routes->get('(:num)', 'RCAController::show/$1');
    $routes->post('(:num)/rca', 'RCAController::addRCA/$1');
    $routes->post('(:num)/capa', 'RCAController::addCAPA/$1');
    $routes->get('statistics', 'RCAController::statistics');
    $routes->get('pareto', 'RCAController::pareto');
});
