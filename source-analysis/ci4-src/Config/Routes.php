<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 * 
 * Ghana Industrial EAM System - Professional Route Configuration
 * Architecture: Pure Modular Routing (Single Source of Truth)
 * 
 * This file contains ONLY bootstrap code.
 * All module routes are defined in app/Config/Routes/*.php
 */

// ============================================================================
// MODULAR ROUTES: Load all module routes dynamically
// ============================================================================
require_once APPPATH . 'Config/Routes/AllModules.php';

// ============================================================================
// PUBLIC ROUTES: No authentication required
// ============================================================================
$routes->get('api/health', 'App\Controllers\Api\V1\Modules\Core\HealthController::index');
$routes->get('api/status', 'App\Controllers\Api\V1\Modules\Core\SystemHealthController::index');

// ============================================================================
// AUTHENTICATED ROUTES: All routes loaded from Routes/ directory
// ============================================================================
// Module routes are automatically loaded by AllModules.php based on:
// - Core.php (Auth, Dashboard, System Settings)
// - ASSET.php (Assets, BOM, Facilities, Equipment)
// - RWOP.php (Work Orders, Maintenance Requests)
// - MRMP.php (PM, Calibration, Meters)
// - MPMP.php (Production, OEE, Downtime)
// - IMS.php (Inventory, Parts, Vendors)
// - HRMS.php (Users, Shifts, Training)
// - TRAC.php (LOTO, Permits, Risk Assessment)
// - IOT.php (IoT Devices, Predictive Maintenance)
// - DIGITAL_TWIN.php (3D Models, Digital Twin)
// - MOBILE.php (Mobile API, Sync)
// - REPORTS.php (Analytics, Reports)
// - LICENSE (Module Licensing)
//
// To add new routes, edit the appropriate module file in app/Config/Routes/
