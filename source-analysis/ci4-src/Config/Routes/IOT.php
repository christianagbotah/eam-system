<?php

/**
 * IOT Module Routes
 * Standard Pattern: jwtauth → modulelicense → moduleactive
 */

$routes->group('api/v1/eam', ['filter' => ['jwtauth', 'moduleactive']], function($routes) {
    // IoT Device Management
    $routes->resource('iot', ['controller' => 'Api\\V1\\Modules\\IOT\\IoTController']);
    $routes->resource('iot-data', ['controller' => 'Api\\V1\\Modules\\IOT\\IoTDataController']);
    $routes->resource('iot-rules', ['controller' => 'Api\\V1\\Modules\\IOT\\IoTRulesController']);
    
    // Predictive Maintenance
    $routes->resource('predictive', ['controller' => 'Api\\V1\\Modules\\IOT\\PredictiveController']);
    $routes->get('predictive/analyze/(:num)', 'Api\\V1\\Modules\\IOT\\PredictiveController::analyze/$1');
});
