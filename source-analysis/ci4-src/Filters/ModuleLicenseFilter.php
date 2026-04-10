<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Module License Filter - Step 1
 * Checks if system/vendor admin activated module license (is_active=1)
 */
class ModuleLicenseFilter implements FilterInterface
{

    protected $moduleRouteMap = [
        'assets' => 'ASSET',
        'assets-unified' => 'ASSET',
        'equipment' => 'ASSET',
        'machines' => 'ASSET',
        'assemblies' => 'ASSET',
        'parts' => 'ASSET',
        'facilities' => 'ASSET',
        'bom' => 'ASSET',
        'work-orders' => 'RWOP',
        'maintenance' => 'RWOP',
        'work-execution' => 'RWOP',
        'pm-templates' => 'MRMP',
        'pm-rules' => 'MRMP',
        'calibration' => 'MRMP',
        'meters' => 'MRMP',
        'iot' => 'IOT',
        'predictive' => 'IOT',
        'inventory' => 'IMS',
        'vendors' => 'IMS',
        'stock-transactions' => 'IMS',
        'production' => 'MPMP',
        'oee' => 'MPMP',
        'work-centers' => 'MPMP',
        'downtime' => 'MPMP',
        'surveys' => 'MPMP',
        'risk-assessment' => 'TRAC',
        'loto' => 'TRAC',
        'permits' => 'TRAC',
        'tools' => 'TRAC',
        'users' => 'HRMS',
        'departments' => 'HRMS',
        'shifts' => 'HRMS',
        'training' => 'HRMS',
        'reports' => 'REPORTS',
        'models' => 'DIGITAL_TWIN',
    ];

    public function before(RequestInterface $request, $arguments = null)
    {
        $uri = $request->getUri()->getPath();
        $moduleCode = $this->extractModuleFromUri($uri);

        if (!$moduleCode || $moduleCode === 'CORE') {
            return null; // CORE always accessible
        }

        // For single-company system, default to company_id = 1
        $companyId = 1;

        // Check if system/vendor admin activated license
        $db = \Config\Database::connect();
        $builder = $db->table('company_module_licenses');
        $license = $builder
            ->where('company_id', $companyId)
            ->where('module_code', $moduleCode)
            ->where('is_active', 1)
            ->get()
            ->getRowArray();

        if (!$license) {
            return service('response')
                ->setJSON([
                    'status' => 'error',
                    'message' => 'Module not licensed. Contact system administrator.',
                    'module' => $moduleCode,
                    'code' => 'MODULE_NOT_LICENSED'
                ])
                ->setStatusCode(403);
        }

        // Check license validity period
        if (isset($license['valid_until']) && $license['valid_until']) {
            $gracePeriod = $license['grace_period_days'] ?? 30;
            $expiryWithGrace = strtotime($license['valid_until'] . " +{$gracePeriod} days");
            
            if (time() > $expiryWithGrace) {
                return service('response')
                    ->setJSON([
                        'status' => 'error',
                        'message' => 'Module license expired. Contact system administrator.',
                        'module' => $moduleCode,
                        'code' => 'LICENSE_EXPIRED'
                    ])
                    ->setStatusCode(403);
            }
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }

    protected function extractModuleFromUri(string $uri): ?string
    {
        // Exclude certain routes from module filtering
        $coreRoutes = ['dashboard', 'auth', 'settings', 'notifications', 'system-modules', 'company-modules', 'digital-twin', 'analytics'];
        
        foreach ($coreRoutes as $route) {
            if (strpos($uri, '/' . $route) !== false) {
                return 'CORE';
            }
        }
        
        foreach ($this->moduleRouteMap as $route => $module) {
            if (strpos($uri, '/' . $route) !== false) {
                return $module;
            }
        }
        return 'CORE';
    }
}
