<?php

/**
 * ASSET Module Routes
 * Standard Pattern: jwt → modulelicense → moduleactive
 */

$routes->group('api/v1/eam', ['namespace' => 'App\Controllers\Api\V1\Modules\ASSET', 'filter' => ['jwtauth', 'moduleactive']], function($routes) {
    
    // Assets Unified
    $routes->get('assets-unified', 'AssetsUnifiedController::index');
    $routes->post('assets-unified', 'AssetsUnifiedController::create');
    $routes->get('assets-unified/(:segment)', 'AssetsUnifiedController::show/$1');
    $routes->put('assets-unified/(:segment)', 'AssetsUnifiedController::update/$1');
    $routes->delete('assets-unified/(:segment)', 'AssetsUnifiedController::delete/$1');
    $routes->get('assets-unified/(:segment)/hierarchy', 'AssetsUnifiedController::hierarchy/$1');
    
    // Equipment Management
    $routes->get('equipment', 'EquipmentController::index');
    $routes->post('equipment', 'EquipmentController::create');
    $routes->get('equipment/(:segment)', 'EquipmentController::show/$1');
    $routes->put('equipment/(:segment)', 'EquipmentController::update/$1');
    $routes->delete('equipment/(:segment)', 'EquipmentController::delete/$1');
    $routes->get('equipment/(:segment)/parts', 'EquipmentController::getParts/$1');
    
    // Machines
    $routes->get('machines', 'MachineController::index');
    $routes->post('machines', 'MachineController::create');
    $routes->get('machines/(:segment)', 'MachineController::show/$1');
    $routes->put('machines/(:segment)', 'MachineController::update/$1');
    $routes->delete('machines/(:segment)', 'MachineController::delete/$1');
    $routes->get('machines/(:segment)/assemblies', 'MachineController::assemblies/$1');
    $routes->post('machines/(:segment)/assemblies', 'AssembliesController::create/$1');
    
    // Assemblies
    $routes->get('assemblies', 'AssembliesController::index');
    $routes->post('assemblies', 'AssembliesController::create');
    $routes->get('assemblies/(:segment)', 'AssembliesController::show/$1');
    $routes->put('assemblies/(:segment)', 'AssembliesController::update/$1');
    $routes->delete('assemblies/(:segment)', 'AssembliesController::delete/$1');
    $routes->get('assemblies/(:segment)/parts', 'AssembliesController::parts/$1');
    
    // Components
    $routes->get('components', 'ComponentsController::index');
    $routes->post('components', 'ComponentsController::create');
    $routes->get('components/(:segment)', 'ComponentsController::show/$1');
    $routes->put('components/(:segment)', 'ComponentsController::update/$1');
    $routes->delete('components/(:segment)', 'ComponentsController::delete/$1');
    
    // Systems
    $routes->get('systems', 'SystemsController::index');
    $routes->post('systems', 'SystemsController::create');
    $routes->get('systems/(:segment)', 'SystemsController::show/$1');
    $routes->put('systems/(:segment)', 'SystemsController::update/$1');
    $routes->delete('systems/(:segment)', 'SystemsController::delete/$1');
    
    // Facilities
    $routes->get('facilities', 'FacilitiesController::index');
    $routes->post('facilities', 'FacilitiesController::create');
    $routes->get('facilities/(:segment)', 'FacilitiesController::show/$1');
    $routes->put('facilities/(:segment)', 'FacilitiesController::update/$1');
    $routes->delete('facilities/(:segment)', 'FacilitiesController::delete/$1');
    
    // Asset Tree & Hierarchy
    $routes->get('asset-tree/(:segment)', 'AssetTreeController::getTree/$1');
    $routes->get('asset-node/(:segment)', 'AssetTreeController::getNode/$1');
    $routes->post('asset-node', 'AssetTreeController::createNode');
    $routes->put('asset-node/(:segment)', 'AssetTreeController::updateNode/$1');
    $routes->delete('asset-node/(:segment)', 'AssetTreeController::deleteNode/$1');
    $routes->post('asset-node/reorder', 'AssetTreeController::reorderNodes');
    
    // Hierarchy Management
    $routes->get('hierarchy/tree', 'HierarchyController::getTree');
    $routes->get('hierarchy/tree/(:segment)', 'HierarchyController::getTree/$1');
    $routes->get('hierarchy/ancestors/(:segment)', 'HierarchyController::getAncestors/$1');
    $routes->get('hierarchy/descendants/(:segment)', 'HierarchyController::getDescendants/$1');
    $routes->get('hierarchy/breadcrumb/(:segment)', 'HierarchyController::getBreadcrumb/$1');
    $routes->post('hierarchy/move', 'HierarchyController::move');
    $routes->get('hierarchy/search', 'HierarchyController::search');
    
    // 3D Model Management
    $routes->post('3d-model/upload', 'Model3DController::upload');
    $routes->get('3d-model/(:segment)', 'Model3DController::getModel/$1');
    $routes->post('3d-model/(:segment)/hotspot', 'Model3DController::addHotspot/$1');
    $routes->get('3d-model/(:segment)/hotspots', 'Model3DController::getHotspots/$1');
    $routes->delete('3d-model/(:segment)', 'Model3DController::delete/$1');
    
    // Hotspots
    $routes->get('hotspots', 'HotspotsController::index');
    $routes->post('hotspots', 'HotspotsController::create');
    $routes->put('hotspots/(:segment)', 'HotspotsController::update/$1');
    $routes->delete('hotspots/(:segment)', 'HotspotsController::delete/$1');
    $routes->post('asset-node/hotspot', 'AssetTreeController::createHotspot');
    $routes->get('asset-hotspots/(:segment)', 'AssetTreeController::getHotspots/$1');
    $routes->post('asset-usage', 'AssetTreeController::recordUsage');
    
    // Bill of Materials
    $routes->get('bom', 'BomController::index');
    $routes->post('bom', 'BomController::create');
    $routes->get('bom/(:segment)', 'BomController::show/$1');
    $routes->post('bom/import', 'BomController::import');
    $routes->get('bom/export', 'BomController::export');
    $routes->get('bom/(:segment)/explode', 'BomController::explode/$1');
    
    // Visualization
    $routes->get('visualization/tree', 'VisualizationController::getTreeData');
    $routes->get('visualization/tree/(:segment)', 'VisualizationController::getTreeData/$1');
    $routes->get('visualization/health-matrix', 'VisualizationController::getHealthMatrix');
    $routes->get('visualization/relationship-graph/(:segment)', 'VisualizationController::getRelationshipGraph/$1');
    
    // Relationships
    $routes->post('relationship', 'RelationshipController::create');
    $routes->get('relationship/(:segment)', 'RelationshipController::getRelationships/$1');
    $routes->get('relationship/graph/(:segment)', 'RelationshipController::getGraph/$1');
    $routes->get('relationship/path', 'RelationshipController::findPath');
    $routes->delete('relationship/(:segment)', 'RelationshipController::delete/$1');
    
    // Tools Management
    $routes->get('tools', 'ToolsController::index');
    $routes->post('tools', 'ToolsController::create');
    $routes->get('tools/(:segment)', 'ToolsController::show/$1');
    $routes->put('tools/(:segment)', 'ToolsController::update/$1');
    $routes->delete('tools/(:segment)', 'ToolsController::delete/$1');
});
