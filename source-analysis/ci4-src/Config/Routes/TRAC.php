<?php

/**
 * TRAC Module Routes
 * Standard Pattern: jwtauth → modulelicense → moduleactive
 */

$routes->group('api/v1/eam', ['namespace' => 'App\Controllers\Api\V1\Modules\TRAC', 'filter' => ['jwtauth', 'moduleactive']], function($routes) {
    
    // Tools Management
    $routes->get('tools', 'ToolsController::index');
    $routes->post('tools', 'ToolsController::create');
    $routes->get('tools/(:segment)', 'ToolsController::show/$1');
    $routes->put('tools/(:segment)', 'ToolsController::update/$1');
    $routes->delete('tools/(:segment)', 'ToolsController::delete/$1');
    
    // Tool Assignments
    $routes->get('tool-assignments', 'ToolAssignmentsController::index');
    $routes->post('tool-assignments', 'ToolAssignmentsController::create');
    $routes->put('tool-assignments/(:segment)', 'ToolAssignmentsController::update/$1');
    $routes->delete('tool-assignments/(:segment)', 'ToolAssignmentsController::delete/$1');
    $routes->post('tools/(:segment)/checkout', 'ToolAssignmentsController::checkout/$1');
    $routes->post('tools/(:segment)/checkin', 'ToolAssignmentsController::checkin/$1');
    
    // LOTO (Lockout/Tagout)
    $routes->get('loto/procedures', 'LOTOController::index');
    $routes->post('loto/procedures', 'LOTOController::create');
    $routes->get('loto/procedures/(:segment)', 'LOTOController::show/$1');
    $routes->put('loto/procedures/(:segment)', 'LOTOController::update/$1');
    $routes->delete('loto/procedures/(:segment)', 'LOTOController::delete/$1');
    
    // LOTO Locks
    $routes->get('loto/locks', 'LOTOLockController::index');
    $routes->post('loto/locks', 'LOTOLockController::create');
    $routes->get('loto/locks/(:segment)', 'LOTOLockController::show/$1');
    $routes->put('loto/locks/(:segment)', 'LOTOLockController::update/$1');
    $routes->post('loto/locks/(:segment)/apply', 'LOTOLockController::apply/$1');
    $routes->post('loto/locks/(:segment)/remove', 'LOTOLockController::remove/$1');
    
    // Permit to Work
    $routes->get('permits', 'PermitToWorkController::index');
    $routes->post('permits', 'PermitToWorkController::create');
    $routes->get('permits/(:segment)', 'PermitToWorkController::show/$1');
    $routes->put('permits/(:segment)', 'PermitToWorkController::update/$1');
    $routes->post('permits/(:segment)/approve', 'PermitToWorkController::approve/$1');
    $routes->post('permits/(:segment)/close', 'PermitToWorkController::close/$1');
    
    // Rotating Equipment
    $routes->get('rotating-equipment', 'RotatingEquipmentController::index');
    $routes->post('rotating-equipment', 'RotatingEquipmentController::create');
    $routes->get('rotating-equipment/(:segment)', 'RotatingEquipmentController::show/$1');
    $routes->put('rotating-equipment/(:segment)', 'RotatingEquipmentController::update/$1');
    $routes->post('rotating-equipment/(:segment)/rotate', 'RotatingEquipmentController::rotate/$1');
    
    // Ghana-specific Features
    $routes->get('union-custody', 'UnionCustodyController::index');
    $routes->post('union-custody/(:segment)/assign', 'UnionCustodyController::assign/$1');
    $routes->post('union-custody/(:segment)/release', 'UnionCustodyController::release/$1');
    
    $routes->get('gsa-certifications', 'GSACertificationController::index');
    $routes->post('gsa-certifications', 'GSACertificationController::create');
    $routes->get('gsa-certifications/expiring', 'GSACertificationController::expiring');
});
