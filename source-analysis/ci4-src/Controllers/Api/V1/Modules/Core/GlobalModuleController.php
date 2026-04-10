<?php

namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\Api\V1\BaseApiController;

/**
 * Global Module Controller
 * Manages global module activation (single-company, multi-plant)
 * 
 * Two roles:
 * 1. Vendor/System Admin → License modules (is_licensed)
 * 2. Company Admin → Enable modules (is_active)
 */
class GlobalModuleController extends BaseApiController
{
    protected $db;

    public function initializeService()
    {
        parent::initializeService();
        $this->db = \Config\Database::connect();
    }

    /**
     * Get all modules with their status
     * Accessible by: Company Admin, Vendor Admin
     */
    public function index()
    {
        if (!$this->db) {
            $this->initializeService();
        }
        
        $modules = $this->db->table('modules')
            ->orderBy('is_core DESC, code ASC')
            ->get()
            ->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data' => $modules
        ]);
    }

    /**
     * Get active modules only (for sidebar/navigation)
     * Accessible by: All authenticated users
     */
    public function active()
    {
        if (!$this->db) {
            $this->initializeService();
        }
        
        $modules = $this->db->table('modules')
            ->where('is_licensed', 1)
            ->where('is_active', 1)
            ->orderBy('is_core DESC, code ASC')
            ->get()
            ->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data' => $modules
        ]);
    }

    /**
     * VENDOR ADMIN: License a module
     * Makes module available for company admin to enable
     */
    public function license($moduleCode = null)
    {
        if (!$this->db) {
            $this->initializeService();
        }
        
        if (!$moduleCode) {
            $data = $this->request->getJSON(true);
            $moduleCode = $data['module_code'] ?? null;
        }

        if (!$moduleCode) {
            return $this->fail('module_code required', 400);
        }

        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $module = $this->db->table('modules')
            ->where('code', $moduleCode)
            ->get()
            ->getRowArray();

        if (!$module) {
            return $this->fail('Module not found', 404);
        }

        $this->db->table('modules')
            ->where('code', $moduleCode)
            ->update([
                'is_licensed' => 1,
                'licensed_by' => $userId,
                'licensed_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        $this->logModuleAction($module['id'], 'licensed', $userId, 'vendor_admin');
        $this->clearModuleCache($moduleCode);

        return $this->respond([
            'status' => 'success',
            'message' => 'Module licensed successfully'
        ]);
    }

    /**
     * VENDOR ADMIN: Unlicense a module
     */
    public function unlicense($moduleCode = null)
    {
        if (!$this->db) {
            $this->initializeService();
        }
        
        if (!$moduleCode) {
            $data = $this->request->getJSON(true);
            $moduleCode = $data['module_code'] ?? null;
        }

        if (!$moduleCode) {
            return $this->fail('module_code required', 400);
        }

        if ($moduleCode === 'CORE') {
            return $this->fail('Cannot unlicense CORE module', 400);
        }

        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $module = $this->db->table('modules')
            ->where('code', $moduleCode)
            ->get()
            ->getRowArray();

        if (!$module) {
            return $this->fail('Module not found', 404);
        }

        $this->db->table('modules')
            ->where('code', $moduleCode)
            ->update([
                'is_licensed' => 0,
                'is_active' => 0,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        $this->logModuleAction($module['id'], 'unlicensed', $userId, 'vendor_admin');
        $this->clearModuleCache($moduleCode);

        return $this->respond([
            'status' => 'success',
            'message' => 'Module unlicensed successfully'
        ]);
    }

    /**
     * COMPANY ADMIN: Enable a licensed module
     */
    public function enable($moduleCode = null)
    {
        if (!$this->db) {
            $this->initializeService();
        }
        
        if (!$moduleCode) {
            $data = $this->request->getJSON(true);
            $moduleCode = $data['module_code'] ?? null;
        }

        if (!$moduleCode) {
            return $this->fail('module_code required', 400);
        }

        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $module = $this->db->table('modules')
            ->where('code', $moduleCode)
            ->get()
            ->getRowArray();

        if (!$module) {
            return $this->fail('Module not found', 404);
        }

        // Check if locked
        if ($module['activation_locked']) {
            return $this->fail('Module is locked and cannot be modified', 403);
        }

        // Check dependencies
        $depCheck = \Config\ModuleDependencies::areDependenciesActive($moduleCode);
        if (!$depCheck['satisfied']) {
            return $this->fail('Required modules not active: ' . implode(', ', $depCheck['inactive']), 400);
        }

        // Enable module
        $this->db->table('modules')
            ->where('code', $moduleCode)
            ->update([
                'is_active' => 1,
                'activated_by' => $userId,
                'activated_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        $this->logModuleAction($module['id'], 'activated', $userId, 'company_admin');
        $this->clearModuleCache($moduleCode);

        return $this->respond([
            'status' => 'success',
            'message' => 'Module enabled successfully'
        ]);
    }

    /**
     * COMPANY ADMIN: Disable a module
     */
    public function disable($moduleCode = null)
    {
        if (!$this->db) {
            $this->initializeService();
        }
        
        if (!$moduleCode) {
            $data = $this->request->getJSON(true);
            $moduleCode = $data['module_code'] ?? null;
        }

        if (!$moduleCode) {
            return $this->fail('module_code required', 400);
        }

        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $module = $this->db->table('modules')
            ->where('code', $moduleCode)
            ->get()
            ->getRowArray();

        if (!$module) {
            return $this->fail('Module not found', 404);
        }

        // Check if core or locked
        if ($module['is_core'] || $module['activation_locked']) {
            return $this->fail('Module is locked and cannot be disabled', 403);
        }

        // Check dependents
        $dependents = \Config\ModuleDependencies::getDependents($moduleCode);
        if (!empty($dependents)) {
            $activeDepend = [];
            foreach ($dependents as $dep) {
                $depMod = $this->db->table('modules')->where('code', $dep)->where('is_active', 1)->get()->getRowArray();
                if ($depMod) {
                    $activeDepend[] = $dep;
                }
            }
            if (!empty($activeDepend)) {
                return $this->fail('Cannot disable: modules depend on this: ' . implode(', ', $activeDepend), 400);
            }
        }

        // Disable module
        $this->db->table('modules')
            ->where('code', $moduleCode)
            ->update([
                'is_active' => 0,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        $this->logModuleAction($module['id'], 'deactivated', $userId, 'company_admin');
        $this->clearModuleCache($moduleCode);

        return $this->respond([
            'status' => 'success',
            'message' => 'Module disabled successfully'
        ]);
    }

    /**
     * Get module activation logs
     */
    public function logs($moduleId = null)
    {
        if (!$this->db) {
            $this->initializeService();
        }
        
        $builder = $this->db->table('module_activation_logs mal')
            ->select('mal.*, m.code, m.name as module_name, m.display_name, u.username')
            ->join('modules m', 'm.id = mal.module_id')
            ->join('users u', 'u.id = mal.performed_by', 'left')
            ->orderBy('mal.created_at', 'DESC');

        if ($moduleId) {
            $builder->where('mal.module_id', $moduleId);
        }

        $logs = $builder->limit(100)->get()->getResultArray();

        return $this->respond([
            'status' => 'success',
            'data' => $logs
        ]);
    }

    /**
     * Helper: Log module action
     */
    protected function logModuleAction(int $moduleId, string $action, int $userId, string $role)
    {
        try {
            $request = service('request');
            
            $this->db->table('module_activation_logs')->insert([
                'module_id' => $moduleId,
                'action' => $action,
                'performed_by' => $userId,
                'performed_by_role' => $role,
                'ip_address' => $request->getIPAddress(),
                'user_agent' => $request->getUserAgent()->getAgentString(),
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Failed to log module action: ' . $e->getMessage());
        }
    }

    /**
     * Helper: Get user data from JWT
     */
    protected function getUserData(): array
    {
        $userData = $GLOBALS['jwt_user_data'] ?? session('user_data') ?? [];
        return is_object($userData) ? (array)$userData : $userData;
    }

    /**
     * VENDOR ADMIN: Unlock all modules for testing
     */
    public function unlockAll()
    {
        if (!$this->db) {
            $this->initializeService();
        }

        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $this->db->table('modules')
            ->where('code !=', 'CORE')
            ->update([
                'activation_locked' => 0,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        return $this->respond([
            'status' => 'success',
            'message' => 'All modules unlocked successfully'
        ]);
    }

    /**
     * VENDOR ADMIN: Lock a module
     */
    public function lock($moduleCode = null)
    {
        if (!$this->db) {
            $this->initializeService();
        }

        if (!$moduleCode) {
            return $this->fail('module_code required', 400);
        }

        if ($moduleCode === 'CORE') {
            return $this->fail('Cannot lock/unlock CORE module', 400);
        }

        $module = $this->db->table('modules')
            ->where('code', $moduleCode)
            ->get()
            ->getRowArray();

        if (!$module) {
            return $this->fail('Module not found', 404);
        }

        $this->db->table('modules')
            ->where('code', $moduleCode)
            ->update([
                'activation_locked' => 1,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        return $this->respond([
            'status' => 'success',
            'message' => 'Module locked successfully'
        ]);
    }

    /**
     * VENDOR ADMIN: Unlock a module
     */
    public function unlock($moduleCode = null)
    {
        if (!$this->db) {
            $this->initializeService();
        }

        if (!$moduleCode) {
            return $this->fail('module_code required', 400);
        }

        if ($moduleCode === 'CORE') {
            return $this->fail('Cannot lock/unlock CORE module', 400);
        }

        $module = $this->db->table('modules')
            ->where('code', $moduleCode)
            ->get()
            ->getRowArray();

        if (!$module) {
            return $this->fail('Module not found', 404);
        }

        $this->db->table('modules')
            ->where('code', $moduleCode)
            ->update([
                'activation_locked' => 0,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        return $this->respond([
            'status' => 'success',
            'message' => 'Module unlocked successfully'
        ]);
    }
}
