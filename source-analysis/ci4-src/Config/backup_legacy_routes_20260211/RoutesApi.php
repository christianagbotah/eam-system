<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// API v1 Routes - Updated for Modular Structure
$routes->group('api/v1', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Public routes (no auth required) - Core module
    $routes->post('auth/login', 'Modules\Core\AuthController::login');
    $routes->post('auth/register', 'Modules\Core\AuthController::register');
    $routes->post('auth/refresh', 'Modules\Core\AuthController::refresh');

    // Protected routes (JWT auth required)
    $routes->group('', ['filter' => 'jwtauth'], function($routes) {
        
        // Auth - Core module
        $routes->get('auth/me', 'Modules\Core\AuthController::me');
        $routes->post('auth/logout', 'Modules\Core\AuthController::logout');

        // Assets - ASSET module
        $routes->get('assets', 'Modules\ASSET\AssetsUnifiedController::index');
        $routes->get('assets/(:num)', 'Modules\ASSET\AssetsUnifiedController::show/$1');
        $routes->post('assets', 'Modules\ASSET\AssetsUnifiedController::create');
        $routes->put('assets/(:num)', 'Modules\ASSET\AssetsUnifiedController::update/$1');
        $routes->delete('assets/(:num)', 'Modules\ASSET\AssetsUnifiedController::delete/$1');

        // Asset Hierarchy - ASSET module
        $routes->get('equipment', 'Modules\ASSET\MachineController::index');
        $routes->get('equipment/(:num)/assemblies', 'Modules\ASSET\AssemblyController::index/$1');
        $routes->post('equipment/(:num)/assemblies', 'Modules\ASSET\AssemblyController::create/$1');

        // Preventive Maintenance - MRMP module
        $routes->get('pm/schedules', 'Modules\MRMP\PmController::index');
        $routes->post('pm/schedules', 'Modules\MRMP\PmController::create');
        $routes->get('pm/schedules/(:num)', 'Modules\MRMP\PmController::show/$1');
        $routes->put('pm/schedules/(:num)', 'Modules\MRMP\PmController::update/$1');
        $routes->delete('pm/schedules/(:num)', 'Modules\MRMP\PmController::delete/$1');
        $routes->post('pm/generate-work-orders', 'Modules\MRMP\PmController::generateWorkOrders');

        // Work Orders - RWOP module
        $routes->get('work-orders', 'Modules\RWOP\WorkOrdersController::index');
        $routes->post('work-orders', 'Modules\RWOP\WorkOrdersController::create');
        $routes->get('work-orders/(:num)', 'Modules\RWOP\WorkOrdersController::show/$1');
        $routes->put('work-orders/(:num)', 'Modules\RWOP\WorkOrdersController::update/$1');
        $routes->post('work-orders/(:num)/complete', 'Modules\RWOP\WorkOrdersController::complete/$1');

        // Inventory - IMS module
        $routes->get('inventory/parts', 'Modules\IMS\PartsController::index');
        $routes->get('inventory/parts/(:num)', 'Modules\IMS\PartsController::show/$1');
        $routes->post('inventory/parts', 'Modules\IMS\PartsController::create');
        $routes->put('inventory/parts/(:num)', 'Modules\IMS\PartsController::update/$1');
        $routes->get('inventory/low-stock', 'Modules\IMS\InventoryController::getLowStock');

        // Production - MPMP module
        $routes->get('production', 'Modules\MPMP\ProductionController::index');
        $routes->post('production', 'Modules\MPMP\ProductionController::create');
        $routes->get('production/(:num)', 'Modules\MPMP\ProductionController::show/$1');
        $routes->put('production/(:num)', 'Modules\MPMP\ProductionController::update/$1');
        $routes->delete('production/(:num)', 'Modules\MPMP\ProductionController::delete/$1');
        $routes->get('production/surveys', 'Modules\MPMP\SurveysController::index');
        $routes->post('production/surveys', 'Modules\MPMP\SurveysController::create');

        // Notifications - Core module
        $routes->get('notifications', 'Modules\Core\NotificationsController::index');
        $routes->patch('notifications/(:num)/read', 'Modules\Core\NotificationsController::markAsRead/$1');
        $routes->delete('notifications/(:num)', 'Modules\Core\NotificationsController::delete/$1');

        // Users & Roles - HRMS module
        $routes->get('users', 'Modules\HRMS\UsersController::index');
        $routes->get('users/(:num)', 'Modules\HRMS\UsersController::show/$1');
        $routes->post('users', 'Modules\HRMS\UsersController::create');
        $routes->put('users/(:num)', 'Modules\HRMS\UsersController::update/$1');
        $routes->delete('users/(:num)', 'Modules\HRMS\UsersController::delete/$1');
        $routes->get('roles', 'Modules\Core\RolesController::index');
        $routes->post('roles', 'Modules\Core\RolesController::create');
    });
});

// API documentation route
$routes->get('api/docs', function() {
    return view('api_documentation');
});
