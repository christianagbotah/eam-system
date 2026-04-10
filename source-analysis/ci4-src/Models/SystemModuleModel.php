<?php

namespace App\Models;

use CodeIgniter\Model;

class SystemModuleModel extends Model
{
    protected $table = 'system_modules';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'object';
    protected $useSoftDeletes = false;
    protected $allowedFields = ['module_code', 'module_name', 'description', 'is_core', 'is_system_licensed', 'license_key', 'license_type', 'max_companies', 'valid_from', 'valid_until'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getLicensedModules()
    {
        return $this->where('is_system_licensed', 1)->findAll();
    }

    public function isModuleLicensed(string $moduleCode): bool
    {
        $module = $this->where('module_code', $moduleCode)->first();
        return $module && ($module->is_core == 1 || $module->is_system_licensed == 1);
    }

    public function isModuleExpired(string $moduleCode): bool
    {
        $module = $this->where('module_code', $moduleCode)->first();
        if (!$module || $module->is_core == 1) return false;
        if (!$module->valid_until) return false;
        return strtotime($module->valid_until) < time();
    }

    public function getModuleStats()
    {
        return [
            'total' => $this->countAll(),
            'licensed' => $this->where('is_system_licensed', 1)->countAllResults(false),
            'core' => $this->where('is_core', 1)->countAllResults(false),
            'expired' => $this->where('valid_until <', date('Y-m-d'))->where('is_core', 0)->countAllResults(false),
        ];
    }
}
