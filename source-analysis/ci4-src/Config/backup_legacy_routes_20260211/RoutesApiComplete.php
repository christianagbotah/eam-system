<?php

use CodeIgniter\Router\RouteCollection;

/**
 * Complete EAM API Routes
 * @var RouteCollection $routes
 */

$routes->group('api/v1', ['namespace' => 'App\Controllers\Api\V1'], function($routes) {
    
    // Health Check
    $routes->get('health', 'HealthController::index');
    
    // Auth (No JWT required)
    $routes->post('auth/login', 'AuthController::login');
    $routes->post('auth/refresh', 'AuthController::refresh');
    
    // Protected Routes (JWT required)
    $routes->group('', ['filter' => 'jwtauth'], function($routes) {
        
        // Auth
        $routes->post('auth/logout', 'AuthController::logout');
        
        // Users
        $routes->get('users', 'UsersController::index');
        $routes->get('users/(:num)', 'UsersController::show/$1');
        $routes->post('users', 'UsersController::create');
        $routes->put('users/(:num)', 'UsersController::update/$1');
        $routes->delete('users/(:num)', 'UsersController::delete/$1');
        $routes->post('users/(:num)/assign-role', 'UsersController::assignRole/$1');
        
        // Roles
        $routes->get('roles', 'RolesController::index');
        $routes->get('roles/(:num)', 'RolesController::show/$1');
        $routes->post('roles', 'RolesController::create');
        $routes->put('roles/(:num)', 'RolesController::update/$1');
        $routes->delete('roles/(:num)', 'RolesController::delete/$1');
        $routes->post('roles/(:num)/permissions', 'RolesController::assignPermissions/$1');
        
        // Asset Hierarchy - Facilities
        $routes->get('facilities', 'FacilitiesController::index');
        $routes->get('facilities/(:num)', 'FacilitiesController::show/$1');
        $routes->post('facilities', 'FacilitiesController::create');
        $routes->put('facilities/(:num)', 'FacilitiesController::update/$1');
        $routes->delete('facilities/(:num)', 'FacilitiesController::delete/$1');
        
        // Asset Hierarchy - Systems
        $routes->get('systems', 'SystemsController::index');
        $routes->get('systems/(:num)', 'SystemsController::show/$1');
        $routes->post('systems', 'SystemsController::create');
        $routes->put('systems/(:num)', 'SystemsController::update/$1');
        $routes->delete('systems/(:num)', 'SystemsController::delete/$1');
        
        // Asset Hierarchy - Equipment
        $routes->get('equipment', 'EquipmentController::index');
        $routes->get('equipment/(:num)', 'EquipmentController::show/$1');
        $routes->post('equipment', 'EquipmentController::create');
        $routes->put('equipment/(:num)', 'EquipmentController::update/$1');
        $routes->delete('equipment/(:num)', 'EquipmentController::delete/$1');
        
        // Asset Hierarchy - Assemblies
        $routes->get('assemblies', 'AssembliesController::index');
        $routes->get('assemblies/(:num)', 'AssembliesController::show/$1');
        $routes->post('assemblies', 'AssembliesController::create');
        $routes->put('assemblies/(:num)', 'AssembliesController::update/$1');
        $routes->delete('assemblies/(:num)', 'AssembliesController::delete/$1');
        
        // Asset Hierarchy - Components
        $routes->get('components', 'ComponentsController::index');
        $routes->get('components/(:num)', 'ComponentsController::show/$1');
        $routes->post('components', 'ComponentsController::create');
        $routes->put('components/(:num)', 'ComponentsController::update/$1');
        $routes->delete('components/(:num)', 'ComponentsController::delete/$1');
        
        // Asset Hierarchy - Parts
        $routes->get('parts', 'PartsController::index');
        $routes->get('parts/(:num)', 'PartsController::show/$1');
        $routes->post('parts', 'PartsController::create');
        $routes->put('parts/(:num)', 'PartsController::update/$1');
        $routes->delete('parts/(:num)', 'PartsController::delete/$1');
        
        // Assets
        $routes->get('assets', 'AssetsController::index');
        $routes->get('assets/(:num)', 'AssetsController::show/$1');
        $routes->get('assets/tree', 'AssetsController::tree');
        $routes->get('assets/(:num)/children', 'AssetsController::children/$1');
        $routes->get('assets/(:num)/hierarchy', 'AssetsController::hierarchy/$1');
        
        // Meters
        $routes->get('meters', 'MetersController::index');
        $routes->get('meters/(:num)', 'MetersController::show/$1');
        $routes->post('meters', 'MetersController::create');
        $routes->put('meters/(:num)', 'MetersController::update/$1');
        $routes->delete('meters/(:num)', 'MetersController::delete/$1');
        
        // Meter Readings
        $routes->get('meter-readings', 'MeterReadingsController::index');
        $routes->post('meter-readings', 'MeterReadingsController::create');
        $routes->get('meters/(:num)/readings', 'MeterReadingsController::byMeter/$1');
        
        // PM Rules
        $routes->get('pm-rules', 'PmRulesController::index');
        $routes->get('pm-rules/(:num)', 'PmRulesController::show/$1');
        $routes->post('pm-rules', 'PmRulesController::create');
        $routes->put('pm-rules/(:num)', 'PmRulesController::update/$1');
        $routes->delete('pm-rules/(:num)', 'PmRulesController::delete/$1');
        
        // PM Schedules
        $routes->get('pm-schedules', 'PmSchedulesController::index');
        $routes->get('pm-schedules/(:num)', 'PmSchedulesController::show/$1');
        $routes->post('pm-schedules/generate', 'PmSchedulesController::generate');
        $routes->get('pm-schedules/overdue', 'PmSchedulesController::overdue');
        
        // Work Orders
        $routes->get('work-orders', 'WorkOrdersController::index');
        $routes->get('work-orders/(:num)', 'WorkOrdersController::show/$1');
        $routes->post('work-orders', 'WorkOrdersController::create');
        $routes->put('work-orders/(:num)', 'WorkOrdersController::update/$1');
        $routes->delete('work-orders/(:num)', 'WorkOrdersController::delete/$1');
        $routes->post('work-orders/(:num)/assign', 'WorkOrdersController::assign/$1');
        $routes->post('work-orders/(:num)/start', 'WorkOrdersController::start/$1');
        $routes->post('work-orders/(:num)/complete', 'WorkOrdersController::complete/$1');
        $routes->post('work-orders/(:num)/cancel', 'WorkOrdersController::cancel/$1');
        
        // Work Order Tasks
        $routes->get('work-orders/(:num)/tasks', 'WorkOrderTasksController::index/$1');
        $routes->post('work-orders/(:num)/tasks', 'WorkOrderTasksController::create/$1');
        $routes->put('work-order-tasks/(:num)', 'WorkOrderTasksController::update/$1');
        $routes->delete('work-order-tasks/(:num)', 'WorkOrderTasksController::delete/$1');
        
        // Work Order Materials
        $routes->get('work-orders/(:num)/materials', 'WorkOrderMaterialsController::index/$1');
        $routes->post('work-orders/(:num)/materials', 'WorkOrderMaterialsController::create/$1');
        $routes->delete('work-order-materials/(:num)', 'WorkOrderMaterialsController::delete/$1');
        
        // Inventory
        $routes->get('inventory', 'InventoryController::index');
        $routes->get('inventory/(:num)', 'InventoryController::show/$1');
        $routes->post('inventory', 'InventoryController::create');
        $routes->put('inventory/(:num)', 'InventoryController::update/$1');
        $routes->delete('inventory/(:num)', 'InventoryController::delete/$1');
        $routes->get('inventory/low-stock', 'InventoryController::lowStock');
        
        // Stock Transactions
        $routes->get('stock-transactions', 'StockTransactionsController::index');
        $routes->post('stock-transactions/stock-in', 'StockTransactionsController::stockIn');
        $routes->post('stock-transactions/stock-out', 'StockTransactionsController::stockOut');
        $routes->post('stock-transactions/adjust', 'StockTransactionsController::adjust');
        
        // Production
        $routes->get('production/summary', 'ProductionController::summary');
        $routes->get('production/equipment/(:num)', 'ProductionController::byEquipment/$1');
        $routes->post('production/record', 'ProductionController::record');
        
        // Notifications
        $routes->get('notifications', 'NotificationsController::index');
        $routes->get('notifications/unread', 'NotificationsController::unread');
        $routes->put('notifications/(:num)/read', 'NotificationsController::markAsRead/$1');
        $routes->delete('notifications/(:num)', 'NotificationsController::delete/$1');
    });
});
