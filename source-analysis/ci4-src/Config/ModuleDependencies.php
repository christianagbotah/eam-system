<?php

namespace Config;

class ModuleDependencies
{
    public static array $dependencies = [
        'RWOP' => ['ASSET'],
        'MRMP' => ['ASSET'],
        'MPMP' => ['ASSET', 'RWOP'],
        'IOT' => ['ASSET'],
        'DIGITAL_TWIN' => ['ASSET'],
        'TRAC' => ['ASSET'],
        'MOBILE' => ['RWOP'],
    ];

    public static function getDependencies(string $moduleCode): array
    {
        return self::$dependencies[$moduleCode] ?? [];
    }

    public static function areDependenciesActive(string $moduleCode): array
    {
        $dependencies = self::getDependencies($moduleCode);
        if (empty($dependencies)) {
            return ['satisfied' => true, 'inactive' => []];
        }

        $db = \Config\Database::connect();
        $inactive = [];
        
        foreach ($dependencies as $dep) {
            $module = $db->table('modules')
                ->where('code', $dep)
                ->where('is_active', 1)
                ->get()
                ->getRowArray();
            
            if (!$module) {
                $inactive[] = $dep;
            }
        }

        return ['satisfied' => empty($inactive), 'inactive' => $inactive];
    }

    public static function getDependents(string $moduleCode): array
    {
        $dependents = [];
        foreach (self::$dependencies as $module => $deps) {
            if (in_array($moduleCode, $deps)) {
                $dependents[] = $module;
            }
        }
        return $dependents;
    }
}
