<?php

namespace App\Services\Core;

use Config\ModuleRegistry;

/**
 * Module Service - CORE Module
 * Centralized module management and validation
 */
class ModuleService
{
    protected $db;
    protected $registry;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->registry = new ModuleRegistry();
    }

    /**
     * Check if module is enabled
     */
    public function isEnabled(string $moduleCode): bool
    {
        // Check database if table exists
        if ($this->db->tableExists('system_modules')) {
            $module = $this->db->table('system_modules')
                ->where('code', $moduleCode)
                ->orWhere('module_name', $moduleCode)
                ->get()->getRowArray();
            
            return $module ? (bool)$module['is_enabled'] : false;
        }

        // Fallback to static config
        return $this->registry->isEnabled($moduleCode);
    }

    /**
     * Validate module dependencies
     */
    public function validateDependencies(string $moduleCode): array
    {
        $dependencies = $this->registry->getDependencies($moduleCode);
        $missing = [];

        foreach ($dependencies as $dep) {
            if (!$this->isEnabled($dep)) {
                $missing[] = $dep;
            }
        }

        return [
            'valid' => empty($missing),
            'missing' => $missing
        ];
    }

    /**
     * Get module configuration
     */
    public function getModule(string $moduleCode): ?array
    {
        return $this->registry->getModule($moduleCode);
    }

    /**
     * Get all enabled modules
     */
    public function getEnabledModules(): array
    {
        $modules = [];
        foreach ($this->registry->modules as $code => $config) {
            if ($this->isEnabled($code)) {
                $modules[$code] = $config;
            }
        }
        return $modules;
    }
}
