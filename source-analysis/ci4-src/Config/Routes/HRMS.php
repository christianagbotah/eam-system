<?php

/**
 * HRMS Module Routes
 * Standard Pattern: jwtauth → modulelicense → moduleactive
 */

$routes->group('api/v1/eam', ['namespace' => 'App\Controllers\Api\V1\Modules\HRMS', 'filter' => ['jwtauth', 'moduleactive']], function($routes) {
    
    // User Management
    $routes->get('users', 'UsersController::index');
    $routes->post('users', 'UsersController::create');
    $routes->get('users/(:segment)/plants', 'UsersController::getUserPlants/$1');
    $routes->get('users/(:segment)', 'UsersController::show/$1');
    $routes->put('users/(:segment)', 'UsersController::update/$1');
    $routes->delete('users/(:segment)', 'UsersController::delete/$1');
    $routes->post('users/(:segment)/assign-role', 'UsersController::assignRole/$1');
    
    // Employee Management
    $routes->get('employees', 'EmployeesController::index');
    $routes->post('employees', 'EmployeesController::create');
    $routes->get('employees/(:segment)', 'EmployeesController::show/$1');
    $routes->put('employees/(:segment)', 'EmployeesController::update/$1');
    
    // Shift Management
    $routes->get('shifts', 'ShiftsController::index');
    $routes->post('shifts', 'ShiftsController::create');
    $routes->get('shifts/(:segment)', 'ShiftsController::show/$1');
    $routes->put('shifts/(:segment)', 'ShiftsController::update/$1');
    $routes->delete('shifts/(:segment)', 'ShiftsController::delete/$1');
    
    // Employee Shifts
    $routes->get('employee-shifts', 'EmployeeShiftsController::index');
    $routes->post('employee-shifts', 'EmployeeShiftsController::assign');
    $routes->post('employee-shifts/bulk-assign', 'EmployeeShiftsController::bulkAssign');
    $routes->post('employee-shifts/bulk-import', 'EmployeeShiftsController::bulkImport');
    $routes->delete('employee-shifts/(:segment)', 'EmployeeShiftsController::delete/$1');
    
    // Shift Assignments
    $routes->get('shift-assignments', 'ShiftAssignmentController::index');
    $routes->post('shift-assignments', 'ShiftAssignmentController::create');
    $routes->put('shift-assignments/(:segment)', 'ShiftAssignmentController::update/$1');
    
    // Departments
    $routes->get('departments', 'DepartmentsController::index');
    $routes->post('departments', 'DepartmentsController::create');
    $routes->get('departments/(:segment)', 'DepartmentsController::show/$1');
    $routes->put('departments/(:segment)', 'DepartmentsController::update/$1');
    $routes->delete('departments/(:segment)', 'DepartmentsController::delete/$1');
    $routes->get('departments/(:segment)/roster', 'DepartmentsController::roster/$1');
    
    // Skills & Trades
    $routes->get('trades', 'TradesController::index');
    $routes->post('trades', 'TradesController::create');
    $routes->get('skills', 'SkillsController::index');
    $routes->post('skills', 'SkillsController::create');
    $routes->get('skill-categories', 'SkillCategoriesController::index');
    $routes->post('skill-categories', 'SkillCategoriesController::create');
    
    // Training Records
    $routes->get('training-records', 'TrainingRecordsController::index');
    $routes->post('training-records', 'TrainingRecordsController::create');
    $routes->get('training-records/(:segment)', 'TrainingRecordsController::show/$1');
    $routes->put('training-records/(:segment)', 'TrainingRecordsController::update/$1');
    $routes->get('training-records/expiring', 'TrainingRecordsController::expiring');
    
    // Groups
    $routes->get('technician-groups', 'TechnicianGroupController::index');
    $routes->post('technician-groups', 'TechnicianGroupController::create');
    $routes->get('technician-groups/(:segment)', 'TechnicianGroupController::show/$1');
    $routes->put('technician-groups/(:segment)', 'TechnicianGroupController::update/$1');
    $routes->post('technician-groups/(:segment)/members', 'TechnicianGroupController::addMember/$1');
    $routes->delete('technician-groups/(:segment)/members/(:segment)', 'TechnicianGroupController::removeMember/$1/$2');
    
    $routes->get('operator-groups', 'OperatorGroupsController::index');
    $routes->post('operator-groups', 'OperatorGroupsController::create');
    $routes->delete('operator-groups/(:segment)', 'OperatorGroupsController::delete/$1');
    
    // Resource Availability
    $routes->get('resource-availability', 'ResourceAvailabilityController::index');
    $routes->get('resource-availability/utilization', 'ResourceAvailabilityController::utilization');
    
    // Ghana-specific Features
    $routes->get('union-members', 'UnionController::getMembers');
    $routes->post('union-members/(:segment)', 'UnionController::addMember/$1');
    $routes->delete('union-members/(:segment)', 'UnionController::removeMember/$1');
    $routes->get('ssnit/calculations', 'SSNITController::getCalculations');
    $routes->post('ssnit/calculate', 'SSNITController::calculate');
});
