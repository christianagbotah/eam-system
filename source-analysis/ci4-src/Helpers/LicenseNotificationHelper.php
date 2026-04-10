<?php

namespace App\Helpers;

use App\Models\CompanyModuleLicenseModel;
use App\Models\SystemModuleModel;

class LicenseNotificationHelper
{
    public static function checkExpiringLicenses(int $days = 30): array
    {
        $companyModel = new CompanyModuleLicenseModel();
        $systemModel = new SystemModuleModel();
        
        $expiring = [];
        $licenses = $companyModel->where('is_active', 1)
            ->where('valid_until IS NOT NULL')
            ->findAll();

        foreach ($licenses as $license) {
            $daysRemaining = (strtotime($license->valid_until) - time()) / 86400;
            
            if ($daysRemaining > 0 && $daysRemaining <= $days) {
                $module = $systemModel->where('module_code', $license->module_code)->first();
                $expiring[] = [
                    'company_id' => $license->company_id,
                    'module_code' => $license->module_code,
                    'module_name' => $module->module_name ?? $license->module_code,
                    'valid_until' => $license->valid_until,
                    'days_remaining' => (int)$daysRemaining
                ];
            }
        }

        return $expiring;
    }

    public static function getExpiredLicenses(): array
    {
        $companyModel = new CompanyModuleLicenseModel();
        $systemModel = new SystemModuleModel();
        
        $expired = [];
        $licenses = $companyModel->where('is_active', 1)
            ->where('valid_until <', date('Y-m-d'))
            ->findAll();

        foreach ($licenses as $license) {
            $module = $systemModel->where('module_code', $license->module_code)->first();
            $expired[] = [
                'company_id' => $license->company_id,
                'module_code' => $license->module_code,
                'module_name' => $module->module_name ?? $license->module_code,
                'valid_until' => $license->valid_until,
                'grace_period_days' => $license->grace_period_days
            ];
        }

        return $expired;
    }
}
