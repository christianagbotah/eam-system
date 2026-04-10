<?php

// Vendor Admin Routes - Licensing & Module Management
$routes->group('licensing', ['filter' => 'vendorAdmin', 'namespace' => 'App\Controllers\Api\V1\Modules\Core'], function($routes) {
    $routes->get('modules', 'LicensingController::getModules');
    $routes->put('modules/(:num)', 'LicensingController::updateModule/$1');
    $routes->get('audit-log', 'LicensingController::getLicenseAuditLog');
});
