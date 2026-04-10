<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Module Enforcement Filter
 * Ensures module is active before allowing access
 * Enterprise single-company system
 */
class EnsureModuleActive implements FilterInterface
{
    protected $db;
    protected $cache;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->cache = \Config\Services::cache();
    }

    public function before(RequestInterface $request, $arguments = null)
    {
        // Get module code from route or arguments
        $moduleCode = $arguments[0] ?? $this->detectModuleFromRoute($request);

        if (!$moduleCode) {
            return null; // No module enforcement needed
        }

        // Check if module is active (with caching)
        if (!$this->isModuleActive($moduleCode)) {
            return service('response')
                ->setJSON([
                    'success' => false,
                    'error' => 'Module not active',
                    'message' => "The {$moduleCode} module is not currently active. Please contact your administrator.",
                    'module' => $moduleCode,
                    'code' => 'MODULE_INACTIVE'
                ])
                ->setStatusCode(403);
        }

        return null;
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }

    /**
     * Check if module is active (cached)
     */
    protected function isModuleActive(string $moduleCode): bool
    {
        $cacheKey = "module_active_{$moduleCode}";
        
        $isActive = $this->cache->get($cacheKey);
        
        if ($isActive === null) {
            $module = $this->db->table('modules')
                ->where('code', $moduleCode)
                ->get()
                ->getRowArray();
            
            $isActive = $module && $module['is_active'] == 1;
            
            // Cache for 5 minutes
            $this->cache->save($cacheKey, $isActive, 300);
        }
        
        return $isActive;
    }

    /**
     * Detect module from route path
     */
    protected function detectModuleFromRoute(RequestInterface $request): ?string
    {
        $uri = $request->getUri()->getPath();
        
        // Map routes to modules
        $routeMap = [
            '/api/v1/eam/assets' => 'ASSET',
            '/api/v1/eam/work-orders' => 'RWOP',
            '/api/v1/eam/maintenance-requests' => 'RWOP',
            '/api/v1/eam/pm-templates' => 'MRMP',
            '/api/v1/eam/calibration' => 'MRMP',
            '/api/v1/eam/oee' => 'MPMP',
            '/api/v1/eam/downtime' => 'MPMP',
            '/api/v1/eam/parts' => 'IMS',
            '/api/v1/eam/inventory' => 'IMS',
            '/api/v1/eam/users' => 'HRMS',
            '/api/v1/eam/departments' => 'HRMS',
            '/api/v1/eam/risk-assessment' => 'TRAC',
            '/api/v1/eam/loto' => 'TRAC',
            '/api/v1/eam/iot' => 'IOT',
            '/api/v1/eam/models' => 'DIGITAL_TWIN',
            '/api/v1/eam/reports' => 'REPORTS',
        ];
        
        foreach ($routeMap as $route => $module) {
            if (strpos($uri, $route) === 0) {
                return $module;
            }
        }
        
        return null;
    }
}
