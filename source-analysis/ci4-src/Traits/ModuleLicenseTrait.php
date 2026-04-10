<?php

namespace App\Traits;

use App\Models\SystemModuleModel;
use App\Models\CompanyModuleLicenseModel;
use App\Models\ModuleUsageLogModel;

trait ModuleLicenseTrait
{
    protected function checkModuleAccess(string $moduleCode, ?int $companyId = null, ?int $userId = null): bool
    {
        $systemModel = new SystemModuleModel();
        $companyModel = new CompanyModuleLicenseModel();
        $logModel = new ModuleUsageLogModel();

        // Core modules always accessible
        $module = $systemModel->where('module_code', $moduleCode)->first();
        if ($module && $module->is_core == 1) {
            $this->logModuleAccess($moduleCode, true, 'Core module', $companyId, $userId);
            return true;
        }

        // Check system license
        if (!$systemModel->isModuleLicensed($moduleCode)) {
            $this->logModuleAccess($moduleCode, false, 'Module not system licensed', $companyId, $userId);
            return false;
        }

        // Check system expiry
        if ($systemModel->isModuleExpired($moduleCode)) {
            $this->logModuleAccess($moduleCode, false, 'System license expired', $companyId, $userId);
            return false;
        }

        // Check company activation
        if ($companyId && !$companyModel->isModuleActive($companyId, $moduleCode)) {
            $this->logModuleAccess($moduleCode, false, 'Module not activated for company', $companyId, $userId);
            return false;
        }

        $this->logModuleAccess($moduleCode, true, null, $companyId, $userId);
        
        if ($companyId) {
            $companyModel->incrementUsage($companyId, $moduleCode);
        }

        return true;
    }

    protected function getActiveModules(int $companyId): array
    {
        $systemModel = new SystemModuleModel();
        $companyModel = new CompanyModuleLicenseModel();

        $licensed = $systemModel->getLicensedModules();
        $active = $companyModel->getActiveModules($companyId);
        $activeCodes = array_column($active, 'module_code');

        return array_filter($licensed, fn($m) => in_array($m->module_code, $activeCodes) || $m->is_core == 1);
    }

    protected function logModuleAccess(string $moduleCode, bool $granted, ?string $reason = null, ?int $companyId = null, ?int $userId = null)
    {
        if (!getenv('LICENSE_CHECK_ENABLED')) return;

        $logModel = new ModuleUsageLogModel();
        $logModel->logAccess([
            'company_id' => $companyId ?? 1,
            'user_id' => $userId ?? 0,
            'module_code' => $moduleCode,
            'action' => 'access_check',
            'access_granted' => $granted ? 1 : 0,
            'denial_reason' => $reason,
        ]);
    }

    protected function isModuleExpired(string $moduleCode, int $companyId): bool
    {
        $companyModel = new CompanyModuleLicenseModel();
        $status = $companyModel->getModuleStatus($companyId, $moduleCode);
        return $status['status'] === 'expired';
    }

    protected function getModuleStatus(string $moduleCode, int $companyId): array
    {
        $systemModel = new SystemModuleModel();
        $companyModel = new CompanyModuleLicenseModel();

        $systemLicensed = $systemModel->isModuleLicensed($moduleCode);
        $companyStatus = $companyModel->getModuleStatus($companyId, $moduleCode);

        return [
            'module_code' => $moduleCode,
            'is_system_licensed' => $systemLicensed,
            'company_status' => $companyStatus,
            'can_access' => $systemLicensed && $companyStatus['is_active'],
        ];
    }
}
