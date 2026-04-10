<?php

/**
 * IMS Module Routes
 * Standard Pattern: jwt → modulelicense → moduleactive
 * Flow: JWT auth → Check license (system admin) → Check enabled (company admin)
 */

$routes->group('api/v1/eam', ['filter' => ['jwtauth', 'moduleactive']], function($routes) {
    
    // Inventory Management
    $routes->get('inventory', 'Api\V1\Modules\IMS\EamInventoryController::index');
    $routes->post('inventory', 'Api\V1\Modules\IMS\EamInventoryController::create');
    $routes->get('inventory/(:num)', 'Api\V1\Modules\IMS\EamInventoryController::show/$1');
    $routes->put('inventory/(:num)', 'Api\V1\Modules\IMS\EamInventoryController::update/$1');
    $routes->delete('inventory/(:num)', 'Api\V1\Modules\IMS\EamInventoryController::delete/$1');
    
    // Stock Operations
    $routes->post('inventory/stock-in', 'Api\V1\Modules\IMS\EamInventoryController::stockIn');
    $routes->post('inventory/stock-out', 'Api\V1\Modules\IMS\EamInventoryController::stockOut');
    $routes->post('inventory/reserve', 'Api\V1\Modules\IMS\EamInventoryController::reserve');
    $routes->post('inventory/(:num)/reserve', 'Api\V1\Modules\IMS\EamInventoryController::reserve/$1');
    $routes->post('inventory/(:num)/consume', 'Api\V1\Modules\IMS\EamInventoryController::consume/$1');
    
    // Parts Management
    $routes->get('parts', 'Api\V1\Modules\IMS\PartsController::index');
    $routes->post('parts', 'Api\V1\Modules\IMS\PartsController::create');
    $routes->get('parts/(:num)', 'Api\V1\Modules\IMS\PartsController::show/$1');
    $routes->put('parts/(:num)', 'Api\V1\Modules\IMS\PartsController::update/$1');
    $routes->delete('parts/(:num)', 'Api\V1\Modules\IMS\PartsController::delete/$1');
    $routes->get('parts/nested/(:num)', 'Api\V1\Modules\IMS\PartsController::getNestedParts/$1');
    $routes->get('parts/(:num)/history', 'Api\V1\Modules\IMS\PartsController::getPartHistory/$1');
    
    // Parts Categories
    $routes->get('parts-categories', 'Api\V1\Modules\IMS\PartsCategoriesController::index');
    
    // Sub-Parts
    $routes->get('sub-parts', 'Api\V1\Modules\IMS\SubPartsController::index');
    $routes->post('sub-parts', 'Api\V1\Modules\IMS\SubPartsController::create');
    $routes->get('sub-parts/(:num)', 'Api\V1\Modules\IMS\SubPartsController::show/$1');
    $routes->put('sub-parts/(:num)', 'Api\V1\Modules\IMS\SubPartsController::update/$1');
    $routes->delete('sub-parts/(:num)', 'Api\V1\Modules\IMS\SubPartsController::delete/$1');
    
    // Material Requisitions
    $routes->get('material-requisitions', 'Api\V1\Modules\IMS\MaterialRequisitionController::index');
    $routes->post('material-requisitions', 'Api\V1\Modules\IMS\MaterialRequisitionController::create');
    $routes->get('material-requisitions/(:num)', 'Api\V1\Modules\IMS\MaterialRequisitionController::show/$1');
    $routes->put('material-requisitions/(:num)', 'Api\V1\Modules\IMS\MaterialRequisitionController::update/$1');
    $routes->post('material-requisitions/(:num)/approve', 'Api\V1\Modules\IMS\MaterialRequisitionController::approve/$1');
    $routes->post('material-requisitions/(:num)/issue', 'Api\V1\Modules\IMS\MaterialRequisitionController::issue/$1');
    
    // Vendors
    $routes->get('vendors', 'Api\V1\Modules\IMS\VendorsController::index');
    $routes->post('vendors', 'Api\V1\Modules\IMS\VendorsController::create');
    $routes->get('vendors/(:num)', 'Api\V1\Modules\IMS\VendorsController::show/$1');
    $routes->put('vendors/(:num)', 'Api\V1\Modules\IMS\VendorsController::update/$1');
    $routes->delete('vendors/(:num)', 'Api\V1\Modules\IMS\VendorsController::delete/$1');
    
    // Stock Transactions & Reports
    $routes->get('stock-transactions', 'Api\V1\Modules\IMS\StockTransactionsController::index');
    $routes->get('stock-reports', 'Api\V1\Modules\IMS\StockReportsController::index');
    
    // Inventory Forecasting
    $routes->get('inventory-forecast', 'Api\V1\Modules\IMS\InventoryForecastController::index');
    $routes->get('inventory-forecast/abc-analysis', 'Api\V1\Modules\IMS\InventoryForecastController::abcAnalysis');
    
    // Equipment Parts
    $routes->get('equipment-parts', 'Api\V1\Modules\IMS\EquipmentPartsController::index');
    $routes->get('equipment/(:num)/parts', 'Api\V1\Modules\IMS\EquipmentPartsController::getEquipmentParts/$1');
    $routes->get('parts/(:num)/history', 'Api\V1\Modules\IMS\EquipmentPartsController::getPartHistory/$1');
    
    // Part PM Tasks
    $routes->get('part-pm-tasks', 'Api\V1\Modules\IMS\PartPmTaskController::index');
    $routes->post('part-pm-tasks', 'Api\V1\Modules\IMS\PartPmTaskController::create');
});
