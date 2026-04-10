<?php

/**
 * MOBILE Module Routes
 * Standard Pattern: jwtauth → modulelicense → moduleactive
 */

$routes->group('api/v1/eam', ['filter' => ['jwtauth', 'moduleactive']], function($routes) {
    // Mobile API Info
    $routes->get('/', 'Api\\V1\\Modules\\MOBILE\\MobileController::index');
    
    // Sync
    $routes->post('sync', 'Api\\V1\\Modules\\MOBILE\\MobileController::sync');
    
    // Mobile Work Orders
    $routes->get('work-orders', 'Api\\V1\\Modules\\MOBILE\\MobileController::workOrders');
});
