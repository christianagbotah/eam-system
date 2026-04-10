<?php

namespace App\Controllers\Api\V1;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\PlantScopeTrait;
use App\Traits\ApiResponseTrait;

/**
 * Base API Controller with Enterprise Security & Module Enforcement
 * Enterprise single-company, multi-plant system
 */
class BaseApiController extends ResourceController
{
    use PlantScopeTrait, ApiResponseTrait;

    protected $db;
    protected $cache;
    protected $format = 'json';

    public function initializeService()
    {
        $this->db = \Config\Database::connect();
        $this->cache = \Config\Services::cache();
    }

    /**
     * Require module to be active
     * Usage: $this->requireModule('ASSET');
     */
    protected function requireModule(string $moduleCode): void
    {
        if (!$this->isModuleActive($moduleCode)) {
            $this->response
                ->setJSON([
                    'success' => false,
                    'error' => 'Module not active',
                    'message' => "The {$moduleCode} module is not currently active.",
                    'module' => $moduleCode,
                    'code' => 'MODULE_INACTIVE'
                ])
                ->setStatusCode(403)
                ->send();
            exit;
        }
    }

    /**
     * Require multiple modules (any one active)
     */
    protected function requireAnyModule(array $moduleCodes): void
    {
        foreach ($moduleCodes as $code) {
            if ($this->isModuleActive($code)) {
                return;
            }
        }

        $this->response
            ->setJSON([
                'success' => false,
                'error' => 'No required module active',
                'message' => 'None of the required modules are currently active.',
                'modules' => $moduleCodes,
                'code' => 'MODULES_INACTIVE'
            ])
            ->setStatusCode(403)
            ->send();
        exit;
    }

    /**
     * Require all modules to be active
     */
    protected function requireAllModules(array $moduleCodes): void
    {
        $inactive = [];

        foreach ($moduleCodes as $code) {
            if (!$this->isModuleActive($code)) {
                $inactive[] = $code;
            }
        }

        if (!empty($inactive)) {
            $this->response
                ->setJSON([
                    'success' => false,
                    'error' => 'Required modules not active',
                    'message' => 'Some required modules are not currently active.',
                    'inactive_modules' => $inactive,
                    'code' => 'MODULES_INACTIVE'
                ])
                ->setStatusCode(403)
                ->send();
            exit;
        }
    }

    /**
     * Check if module is active (cached)
     */
    protected function isModuleActive(string $moduleCode): bool
    {
        if (!$this->cache) {
            $this->initializeService();
        }

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
     * Get active modules list (cached)
     */
    protected function getActiveModules(): array
    {
        if (!$this->cache) {
            $this->initializeService();
        }

        $cacheKey = 'active_modules_list';

        $modules = $this->cache->get($cacheKey);

        if ($modules === null) {
            $modules = $this->db->table('modules')
                ->where('is_active', 1)
                ->select('code, name')
                ->get()
                ->getResultArray();

            $this->cache->save($cacheKey, $modules, 300);
        }

        return $modules;
    }

    /**
     * Clear module cache (call after enable/disable)
     */
    protected function clearModuleCache(string $moduleCode = null): void
    {
        if (!$this->cache) {
            $this->initializeService();
        }

        if ($moduleCode) {
            $this->cache->delete("module_active_{$moduleCode}");
        }
        $this->cache->delete('active_modules_list');
    }

    /**
     * Enterprise RBAC Permission Check
     * Checks if current user has permission for module.action
     */
    protected function checkPermission(string $module, string $action): bool
    {
        $userData = $this->getUserData();
        $userRole = $userData['role'] ?? 'technician';
        $userId = $userData['user_id'] ?? $userData['id'] ?? null;

        if (!$userId) {
            return false;
        }

        // Super admin bypass
        if ($userRole === 'admin') {
            return true;
        }

        if (!$this->db) {
            $this->initializeService();
        }

        // Check role-based permissions
        $hasPermission = $this->db->table('user_roles ur')
            ->join('role_permissions rp', 'ur.role_id = rp.role_id')
            ->join('permissions p', 'rp.permission_id = p.id')
            ->where('ur.user_id', $userId)
            ->where('p.module', $module)
            ->where('p.action', $action)
            ->countAllResults() > 0;

        // Log permission check for audit
        if (!$hasPermission) {
            log_message('warning', sprintf(
                'Permission denied: User %s (%s) attempted %s.%s',
                $userId,
                $userRole,
                $module,
                $action
            ));
        }

        return $hasPermission;
    }

    /**
     * Check multiple permissions (user must have ALL)
     */
    protected function checkPermissions(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (is_array($permission)) {
                list($module, $action) = $permission;
            } else {
                // Assume format "module.action"
                list($module, $action) = explode('.', $permission);
            }

            if (!$this->checkPermission($module, $action)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if user has any of the permissions (OR logic)
     */
    protected function checkAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (is_array($permission)) {
                list($module, $action) = $permission;
            } else {
                list($module, $action) = explode('.', $permission);
            }

            if ($this->checkPermission($module, $action)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get plant IDs for current user (with caching)
     * This method uses the PlantScopeTrait implementation
     */
    // Removed override - using PlantScopeTrait::getPlantIds() directly

    /**
     * Validate user owns resource via plant scoping
     */
    protected function validateResourceOwnership(string $table, int $resourceId, string $plantColumn = 'plant_id'): bool
    {
        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? null;

        if (!$userId) {
            return false;
        }

        if (!$this->db) {
            $this->initializeService();
        }

        // Get user's accessible plants
        $plantIds = $this->getPlantIds();

        if (empty($plantIds)) {
            return false;
        }

        // Check if resource belongs to user's plants
        $resource = $this->db->table($table)
            ->where('id', $resourceId)
            ->whereIn($plantColumn, $plantIds)
            ->get()
            ->getRowArray();

        return !empty($resource);
    }

    /**
     * Audit log sensitive operations
     */
    protected function auditLog(string $action, string $resourceType, int $resourceId, array $oldData = null, array $newData = null): void
    {
        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? null;

        if (!$userId) {
            return;
        }

        $auditData = [
            'user_id' => $userId,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'old_data' => $oldData ? json_encode($oldData) : null,
            'new_data' => $newData ? json_encode($newData) : null,
            'ip_address' => $this->request->getIPAddress(),
            'user_agent' => $this->request->getUserAgent()->getAgentString(),
            'created_at' => date('Y-m-d H:i:s')
        ];

        if ($this->db) {
            $this->db->table('audit_logs')->insert($auditData);
        }

        log_message('info', sprintf(
            'Audit: User %s %s %s ID %d',
            $userId,
            $action,
            $resourceType,
            $resourceId
        ));
    }
}