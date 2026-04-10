<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// RBAC Protected Routes - Updated for Modular Structure
$routes->group('api/v1/protected', ['namespace' => 'App\Controllers\Api\V1', 'filter' => 'jwtauth'], function($routes) {
    
    // Facilities with permissions (ASSET module)
    $routes->get('facilities', 'Modules\ASSET\FacilitiesController::index', ['filter' => 'permission:facilities.view']);
    $routes->post('facilities', 'Modules\ASSET\FacilitiesController::create', ['filter' => 'permission:facilities.create']);
    $routes->put('facilities/(:num)', 'Modules\ASSET\FacilitiesController::update/$1', ['filter' => 'permission:facilities.update']);
    $routes->delete('facilities/(:num)', 'Modules\ASSET\FacilitiesController::delete/$1', ['filter' => 'permission:facilities.delete']);
    
    // Work Orders with permissions (RWOP module)
    $routes->get('work-orders', 'Modules\RWOP\WorkOrdersController::index', ['filter' => 'permission:work_orders.view']);
    $routes->post('work-orders', 'Modules\RWOP\WorkOrdersController::create', ['filter' => 'permission:work_orders.create']);
    $routes->post('work-orders/(:num)/assign', 'Modules\RWOP\WorkOrdersController::assign/$1', ['filter' => 'permission:work_orders.assign']);
    $routes->post('work-orders/(:num)/complete', 'Modules\RWOP\WorkOrdersController::complete/$1', ['filter' => 'permission:work_orders.complete']);
    
    // Inventory with permissions (IMS module)
    $routes->get('inventory', 'Modules\IMS\InventoryController::index', ['filter' => 'permission:inventory.view']);
    $routes->post('inventory/stock-in', 'Modules\IMS\InventoryController::stockIn', ['filter' => 'permission:inventory.stock_in']);
    $routes->post('inventory/stock-out', 'Modules\IMS\InventoryController::stockOut', ['filter' => 'permission:inventory.stock_out']);
    
    // Users with permissions (HRMS module)
    $routes->get('users', 'Modules\HRMS\UsersController::index', ['filter' => 'permission:users.view']);
    $routes->post('users', 'Modules\HRMS\UsersController::create', ['filter' => 'permission:users.create']);
    $routes->put('users/(:num)', 'Modules\HRMS\UsersController::update/$1', ['filter' => 'permission:users.update']);
    $routes->delete('users/(:num)', 'Modules\HRMS\UsersController::delete/$1', ['filter' => 'permission:users.delete']);
});
