<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

/**
 * Module Access Filter
 * Checks if company admin has enabled the module for their company
 * Flow: System/Vendor activates (license) → Company admin enables → Users access
 */
class ModuleAccessFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $moduleCode = $arguments[0] ?? null;
        
        if (!$moduleCode) {
            return null;
        }
        
        // Skip module access check if company_module_licenses table doesn't exist or no company context
        // This allows the system to work without multi-tenancy
        $db = \Config\Database::connect();
        
        // Check if company_module_licenses table exists
        if (!$db->tableExists('company_module_licenses')) {
            return null; // Skip check if table doesn't exist
        }
        
        // Get company_id from JWT user data
        $userData = $GLOBALS['jwt_user_data'] ?? session('jwt_user_data');
        $companyId = is_object($userData) ? ($userData->company_id ?? null) : ($userData['company_id'] ?? null);
        
        // If no company_id, skip the check (single-tenant mode)
        if (!$companyId) {
            return null;
        }
        
        // Check if company admin enabled this module
        $builder = $db->table('company_module_licenses');
        $companyModule = $builder
            ->where('company_id', $companyId)
            ->where('module_code', $moduleCode)
            ->where('is_active', 1)
            ->where('is_enabled', 1)
            ->get()
            ->getRowArray();
        
        if (!$companyModule) {
            return service('response')
                ->setJSON([
                    'status' => 'error',
                    'message' => 'Module not enabled for your company. Contact your company administrator.',
                    'module' => $moduleCode,
                    'code' => 'MODULE_NOT_ENABLED'
                ])
                ->setStatusCode(403);
        }
        
        return null;
    }
    
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        return $response;
    }
}