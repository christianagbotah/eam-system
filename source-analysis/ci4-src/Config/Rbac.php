<?php

namespace App\Config;

use CodeIgniter\Config\BaseConfig;

class Rbac extends BaseConfig
{
    public array $roles = [
        'admin' => [
            'name' => 'Administrator',
            'description' => 'Full system access',
            'permissions' => [
                'asset.create', 'asset.read', 'asset.update', 'asset.delete',
                'assembly.create', 'assembly.read', 'assembly.update', 'assembly.delete',
                'part.create', 'part.read', 'part.update', 'part.delete',
                'bom.import', 'bom.export', 'bom.manage',
                'meter.create', 'meter.read', 'meter.update', 'meter.delete',
                'user.manage', 'system.configure'
            ]
        ],
        'manager' => [
            'name' => 'Manager',
            'description' => 'Production and team oversight',
            'permissions' => [
                'asset.read', 'asset.update',
                'assembly.read', 'assembly.update',
                'part.read', 'part.update',
                'bom.export', 'meter.read', 'meter.update'
            ]
        ],
        'supervisor' => [
            'name' => 'Supervisor',
            'description' => 'Team and equipment assignments',
            'permissions' => [
                'asset.read', 'assembly.read', 'part.read',
                'meter.read', 'meter.update'
            ]
        ],
        'technician' => [
            'name' => 'Technician',
            'description' => 'Work order execution',
            'permissions' => [
                'asset.read', 'assembly.read', 'part.read',
                'meter.read', 'meter.update'
            ]
        ],
        'operator' => [
            'name' => 'Operator',
            'description' => 'Production surveys',
            'permissions' => [
                'asset.read', 'assembly.read', 'part.read',
                'meter.read'
            ]
        ],
        'planner' => [
            'name' => 'Planner',
            'description' => 'PM scheduling',
            'permissions' => [
                'asset.read', 'assembly.read', 'part.read',
                'meter.read'
            ]
        ],
        'shop_attendant' => [
            'name' => 'Shop Attendant',
            'description' => 'Inventory management',
            'permissions' => [
                'part.read', 'part.update'
            ]
        ]
    ];

    public array $permissions = [
        'asset.create' => 'Create assets/machines',
        'asset.read' => 'View assets/machines',
        'asset.update' => 'Update assets/machines',
        'asset.delete' => 'Delete assets/machines',
        'assembly.create' => 'Create assemblies',
        'assembly.read' => 'View assemblies',
        'assembly.update' => 'Update assemblies',
        'assembly.delete' => 'Delete assemblies',
        'part.create' => 'Create parts',
        'part.read' => 'View parts',
        'part.update' => 'Update parts',
        'part.delete' => 'Delete parts',
        'bom.import' => 'Import BOM data',
        'bom.export' => 'Export BOM data',
        'bom.manage' => 'Manage BOM entries',
        'meter.create' => 'Create meters',
        'meter.read' => 'View meters',
        'meter.update' => 'Update meter readings',
        'meter.delete' => 'Delete meters',
        'user.manage' => 'Manage users',
        'system.configure' => 'Configure system settings'
    ];

    public function getRolePermissions(string $role): array
    {
        return $this->roles[$role]['permissions'] ?? [];
    }

    public function getAllPermissions(): array
    {
        return array_keys($this->permissions);
    }

    public function getPermissionDescription(string $permission): string
    {
        return $this->permissions[$permission] ?? '';
    }
}