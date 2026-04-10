<?php

namespace Config;

use CodeIgniter\Config\BaseConfig;

/**
 * Module Registry Configuration
 * Ghana Industrial EAM System - Module Management
 */
class ModuleRegistry extends BaseConfig
{
    /**
     * Registered modules with dependencies and Ghana-specific features
     */
    public array $modules = [
        'core' => [
            'name' => 'Core Platform Services',
            'code' => 'CORE',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => [],
            'routes' => 'Config/Routes/Core.php'
        ],
        'asset' => [
            'name' => 'Asset Management',
            'code' => 'ASSET',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => [],
            'routes' => 'Config/Routes/ASSET.php'
        ],
        'rwop' => [
            'name' => 'Repair Work Order Program',
            'code' => 'RWOP',
            'enabled' => true,
            'version' => '2.1.0',
            'dependencies' => ['ims', 'hrms', 'asset'],
            'routes' => 'Config/Routes/RWOP.php'
        ],
        'mrmp' => [
            'name' => 'Machine Reliability Maintenance Program',
            'code' => 'MRMP',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => ['asset', 'ims'],
            'routes' => 'Config/Routes/MRMP.php'
        ],
        'mpmp' => [
            'name' => 'Manufacturing Production Management',
            'code' => 'MPMP',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => ['asset', 'hrms'],
            'routes' => 'Config/Routes/MPMP.php'
        ],
        'ims' => [
            'name' => 'Inventory Management System',
            'code' => 'IMS',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => [],
            'routes' => 'Config/Routes/IMS.php'
        ],
        'hrms' => [
            'name' => 'Human Resources Management',
            'code' => 'HRMS',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => [],
            'routes' => 'Config/Routes/HRMS.php'
        ],
        'trac' => [
            'name' => 'Tool & Rotating Asset Control',
            'code' => 'TRAC',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => ['asset', 'hrms'],
            'routes' => 'Config/Routes/TRAC.php'
        ],
        'iot' => [
            'name' => 'IoT & Predictive Maintenance',
            'code' => 'IOT',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => ['asset'],
            'routes' => 'Config/Routes/IOT.php'
        ],
        'digital_twin' => [
            'name' => 'Digital Twin & 3D Visualization',
            'code' => 'DIGITAL_TWIN',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => ['asset'],
            'routes' => 'Config/Routes/DIGITAL_TWIN.php'
        ],
        'mobile' => [
            'name' => 'Mobile App API',
            'code' => 'MOBILE',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => ['rwop', 'asset'],
            'routes' => 'Config/Routes/MOBILE.php'
        ],
        'reports' => [
            'name' => 'Advanced Reporting & Analytics',
            'code' => 'REPORTS',
            'enabled' => true,
            'version' => '1.0.0',
            'dependencies' => [],
            'routes' => 'Config/Routes/REPORTS.php'
        ]
    ];

    /**
     * Get module configuration
     */
    public function getModule(string $code): ?array
    {
        $db = \Config\Database::connect();
        if ($db->tableExists('system_modules')) {
            $module = $db->table('system_modules')
                ->where('code', $code)
                ->orWhere('module_name', $code)
                ->get()->getRowArray();
            
            if ($module) {
                return [
                    'code' => $module['code'] ?? $module['module_name'],
                    'name' => $module['display_name'],
                    'enabled' => (bool)$module['is_enabled'],
                    'version' => $module['version'] ?? '1.0.0',
                    'dependencies' => json_decode($module['dependencies'] ?? '[]', true)
                ];
            }
        }
        
        return $this->modules[$code] ?? null;
    }

    /**
     * Check if module is enabled
     */
    public function isEnabled(string $code): bool
    {
        return $this->modules[$code]['enabled'] ?? false;
    }

    /**
     * Get module dependencies
     */
    public function getDependencies(string $code): array
    {
        return $this->modules[$code]['dependencies'] ?? [];
    }
}
