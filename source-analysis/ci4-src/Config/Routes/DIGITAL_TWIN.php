<?php

/**
 * DIGITAL_TWIN Module Routes
 * Standard Pattern: jwtauth → modulelicense → moduleactive
 */

$routes->group('api/v1/eam', ['filter' => ['jwtauth', 'moduleactive']], function($routes) {
    // Digital Twin
    $routes->resource('digital-twin', ['controller' => 'Api\\V1\\Modules\\DIGITAL_TWIN\\DigitalTwinController']);
    $routes->get('digital-twin/metrics', 'Api\\V1\\Modules\\DIGITAL_TWIN\\DigitalTwinController::metrics');
    
    // 3D Models
    $routes->resource('models', ['controller' => 'Api\\V1\\Modules\\DIGITAL_TWIN\\ModelViewerController']);
    $routes->post('models/upload', 'Api\\V1\\Modules\\DIGITAL_TWIN\\ModelUploadController::upload');
    $routes->get('models/(:num)/3d', 'Api\\V1\\Modules\\DIGITAL_TWIN\\Model3DController::show/$1');
    
    // Hotspots
    $routes->resource('hotspots', ['controller' => 'Api\\V1\\Modules\\DIGITAL_TWIN\\HotspotController']);
    $routes->get('models/(:num)/hotspots', 'Api\\V1\\Modules\\DIGITAL_TWIN\\HotspotController::byModel/$1');
});
