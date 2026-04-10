<?php

namespace Config;

class RBACConfig
{
    public static $roleHierarchy = [
        'admin' => 10,
        'manager' => 8,
        'planner' => 6,
        'supervisor' => 5,
        'technician' => 3,
        'operator' => 2,
        'shop_attendant' => 4
    ];

    public static $modulePermissions = [
        // Core EAM
        'assets' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'view', 'supervisor' => 'view', 'technician' => 'view', 'operator' => 'view'],
        'work_orders' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'assigned', 'technician' => 'assigned'],
        'pm_schedules' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view', 'technician' => 'view'],
        'maintenance_requests' => ['admin' => 'full', 'manager' => 'full', 'supervisor' => 'full', 'planner' => 'full', 'operator' => 'create'],
        
        // Advanced Features
        'bom' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view', 'technician' => 'view'],
        'calibration' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view', 'technician' => 'view'],
        'downtime' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'view', 'supervisor' => 'full', 'technician' => 'create', 'operator' => 'create'],
        'oee' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'view', 'supervisor' => 'full', 'technician' => 'view', 'operator' => 'view'],
        'meter_readings' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'view', 'supervisor' => 'full', 'technician' => 'full', 'operator' => 'full'],
        'training' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'team', 'technician' => 'own', 'operator' => 'own'],
        'risk_assessment' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view', 'technician' => 'view'],
        'work_centers' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view', 'technician' => 'view'],
        'resources' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view', 'technician' => 'view'],
        'resource_planning' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view', 'technician' => 'view'],
        
        // Failure Analysis & RCA
        'failure_analysis' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'full', 'technician' => 'create'],
        'rca' => ['admin' => 'full', 'manager' => 'approve', 'planner' => 'full', 'supervisor' => 'create', 'technician' => 'view'],
        'rca_analysis' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'full', 'technician' => 'view'],
        'capa' => ['admin' => 'full', 'manager' => 'approve', 'planner' => 'full', 'supervisor' => 'create', 'technician' => 'view'],
        
        // Phase 1 Modules
        'condition_monitoring' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'view', 'supervisor' => 'view', 'technician' => 'view'],
        'mobile_work_orders' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'view', 'supervisor' => 'full', 'technician' => 'full'],
        'parts_optimization' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'shop_attendant' => 'view'],
        'rcm' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full'],
        'backlog_management' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view'],
        'kpi_dashboard' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'view', 'supervisor' => 'view'],
        'notifications' => ['admin' => 'full', 'manager' => 'view', 'planner' => 'view', 'supervisor' => 'view', 'technician' => 'view', 'operator' => 'view', 'shop_attendant' => 'view'],
        
        // Phase 2 Modules - IoT & Monitoring
        'iot_devices' => ['admin' => 'full', 'manager' => 'full', 'supervisor' => 'view'],
        'iot_monitoring' => ['admin' => 'full', 'manager' => 'full', 'supervisor' => 'view', 'technician' => 'view'],
        'iot_sensors' => ['admin' => 'full', 'manager' => 'view', 'planner' => 'view', 'supervisor' => 'view', 'technician' => 'view'],
        
        // Inventory & Parts
        'inventory' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'request', 'technician' => 'request', 'shop_attendant' => 'full'],
        'parts' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view', 'technician' => 'view', 'shop_attendant' => 'view'],
        'material_requests' => ['admin' => 'full', 'manager' => 'approve', 'planner' => 'view', 'supervisor' => 'approve', 'technician' => 'create', 'shop_attendant' => 'issue'],
        
        // Reports & Analytics
        'reports' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view', 'technician' => 'view'],
        'analytics' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'view'],
        
        // System & Admin
        'users' => ['admin' => 'full'],
        'settings' => ['admin' => 'full', 'manager' => 'view'],
        'departments' => ['admin' => 'full', 'manager' => 'full', 'supervisor' => 'view'],
        'facilities' => ['admin' => 'full', 'manager' => 'full', 'supervisor' => 'view'],
        'vendors' => ['admin' => 'full', 'manager' => 'full', 'supervisor' => 'view'],
        
        // Phase 3: Work Order Completion
        'work_order_completion' => ['admin' => 'full', 'manager' => 'full', 'planner' => 'full', 'supervisor' => 'full', 'technician' => 'full'],
        'time_tracking' => ['admin' => 'full', 'manager' => 'view', 'planner' => 'view', 'supervisor' => 'view', 'technician' => 'full'],
        
        // Phase 4: Permit to Work & LOTO
        'permit_to_work' => ['admin' => 'full', 'manager' => 'approve', 'supervisor' => 'approve', 'planner' => 'create', 'technician' => 'view'],
        'loto' => ['admin' => 'full', 'manager' => 'full', 'supervisor' => 'full', 'technician' => 'apply'],
    ];

    public static function hasPermission($role, $module, $action = 'view')
    {
        if (!isset(self::$modulePermissions[$module])) return false;
        if (!isset(self::$modulePermissions[$module][$role])) return false;
        
        $permission = self::$modulePermissions[$module][$role];
        
        if ($permission === 'full') return true;
        if ($permission === $action) return true;
        if ($permission === 'view' && $action === 'view') return true;
        
        return false;
    }

    public static function canAccess($userRole, $requiredRole)
    {
        return self::$roleHierarchy[$userRole] >= self::$roleHierarchy[$requiredRole];
    }
}
