<?php
namespace Config;

use CodeIgniter\Config\BaseConfig;

class Permissions extends BaseConfig
{
    public $rolePermissions = [
        'admin' => ['*'], // All permissions
        
        'manager' => [
            'work_orders.view', 'work_orders.create', 'work_orders.update', 'work_orders.assign',
            'assets.view', 'assets.create', 'assets.update',
            'facilities.view', 'facilities.create', 'facilities.update',
            'pm.view', 'pm.create', 'pm.update',
            'reports.view', 'reports.export',
            'users.view',
            'inventory.view', 'inventory.update',
            'plants.view'
        ],
        
        'supervisor' => [
            'work_orders.view', 'work_orders.create', 'work_orders.update', 'work_orders.assign',
            'assets.view',
            'facilities.view',
            'pm.view',
            'reports.view',
            'inventory.view',
            'plants.view'
        ],
        
        'technician' => [
            'work_orders.view', 'work_orders.update',
            'assets.view',
            'facilities.view',
            'pm.view', 'pm.execute',
            'inventory.view',
            'plants.view'
        ],
        
        'operator' => [
            'work_orders.view',
            'assets.view',
            'facilities.view',
            'production.create', 'production.view',
            'plants.view'
        ],
        
        'planner' => [
            'work_orders.view', 'work_orders.create', 'work_orders.schedule',
            'assets.view',
            'facilities.view',
            'pm.view', 'pm.create', 'pm.schedule',
            'reports.view',
            'plants.view'
        ],
        
        'shop_attendant' => [
            'inventory.view', 'inventory.update', 'inventory.stock_in', 'inventory.stock_out',
            'work_orders.view',
            'plants.view'
        ]
    ];
}
