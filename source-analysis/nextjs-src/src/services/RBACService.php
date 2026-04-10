<?php

namespace App\Services;

/**
 * Enterprise RBAC Service
 * Role-Based Access Control for large factory operations
 */
class RBACService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    /**
     * Check if user has permission
     */
    public function hasPermission(int $userId, string $permissionCode, int $plantId = null, int $areaId = null): bool
    {
        // Check direct role permissions
        $query = "
            SELECT COUNT(*) as count
            FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = ? 
                AND p.permission_code = ?
                AND ur.is_active = 1
                AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        ";
        
        $params = [$userId, $permissionCode];
        
        // Add plant/area filtering if specified
        if ($plantId) {
            $query .= " AND (ur.plant_id IS NULL OR ur.plant_id = ?)";
            $params[] = $plantId;
        }
        
        if ($areaId) {
            $query .= " AND (ur.area_id IS NULL OR ur.area_id = ?)";
            $params[] = $areaId;
        }
        
        $result = $this->db->query($query, $params)->getRow();
        
        if ($result->count > 0) {
            return true;
        }
        
        // Check permission overrides
        $override = $this->db->query("
            SELECT override_type
            FROM permission_overrides po
            JOIN permissions p ON po.permission_id = p.id
            WHERE po.user_id = ? 
                AND p.permission_code = ?
                AND po.expires_at > NOW()
            ORDER BY po.created_at DESC
            LIMIT 1
        ", [$userId, $permissionCode])->getRow();
        
        if ($override) {
            return $override->override_type === 'grant';
        }
        
        return false;
    }
    
    /**
     * Assign role to user
     */
    public function assignRole(int $userId, int $roleId, int $assignedBy, int $plantId = null, int $areaId = null, string $expiresAt = null): array
    {
        try {
            // Check if assignment already exists
            $existing = $this->db->table('user_roles')
                                ->where('user_id', $userId)
                                ->where('role_id', $roleId)
                                ->where('plant_id', $plantId)
                                ->where('area_id', $areaId)
                                ->where('is_active', 1)
                                ->get()
                                ->getRow();
            
            if ($existing) {
                return ['success' => false, 'error' => 'Role assignment already exists'];
            }
            
            $data = [
                'user_id' => $userId,
                'role_id' => $roleId,
                'plant_id' => $plantId,
                'area_id' => $areaId,
                'assigned_by' => $assignedBy,
                'expires_at' => $expiresAt
            ];
            
            $this->db->table('user_roles')->insert($data);
            
            // Log the assignment
            $this->logRoleChange($userId, $roleId, 'assigned', $assignedBy);
            
            return ['success' => true, 'message' => 'Role assigned successfully'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Revoke role from user
     */
    public function revokeRole(int $userId, int $roleId, int $revokedBy, int $plantId = null, int $areaId = null): array
    {
        try {
            $builder = $this->db->table('user_roles')
                               ->where('user_id', $userId)
                               ->where('role_id', $roleId);
            
            if ($plantId) {
                $builder->where('plant_id', $plantId);
            }
            
            if ($areaId) {
                $builder->where('area_id', $areaId);
            }
            
            $updated = $builder->update(['is_active' => 0]);
            
            if ($updated) {
                $this->logRoleChange($userId, $roleId, 'revoked', $revokedBy);
                return ['success' => true, 'message' => 'Role revoked successfully'];
            }
            
            return ['success' => false, 'error' => 'Role assignment not found'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Grant permission override
     */
    public function grantPermissionOverride(int $userId, string $permissionCode, string $reason, int $approvedBy, string $expiresAt): array
    {
        try {
            // Get permission ID
            $permission = $this->db->table('permissions')
                                  ->where('permission_code', $permissionCode)
                                  ->get()
                                  ->getRow();
            
            if (!$permission) {
                return ['success' => false, 'error' => 'Permission not found'];
            }
            
            $data = [
                'id' => $this->generateUuid(),
                'user_id' => $userId,
                'permission_id' => $permission->id,
                'override_type' => 'grant',
                'reason' => $reason,
                'approved_by' => $approvedBy,
                'expires_at' => $expiresAt
            ];
            
            $this->db->table('permission_overrides')->insert($data);
            
            // Log the override
            $this->logPermissionOverride($userId, $permissionCode, 'granted', $approvedBy, $reason);
            
            return ['success' => true, 'message' => 'Permission override granted'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Get user permissions
     */
    public function getUserPermissions(int $userId): array
    {
        $permissions = $this->db->query("
            SELECT DISTINCT p.permission_code, p.permission_name, p.module, p.action
            FROM user_roles ur
            JOIN role_permissions rp ON ur.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            WHERE ur.user_id = ? 
                AND ur.is_active = 1
                AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            ORDER BY p.module, p.action
        ", [$userId])->getResultArray();
        
        return $permissions;
    }
    
    /**
     * Get user roles
     */
    public function getUserRoles(int $userId): array
    {
        $roles = $this->db->query("
            SELECT r.role_code, r.role_name, ur.plant_id, ur.area_id, 
                   p.plant_name, pa.area_name, ur.expires_at
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            LEFT JOIN plants p ON ur.plant_id = p.id
            LEFT JOIN plant_areas pa ON ur.area_id = pa.id
            WHERE ur.user_id = ? AND ur.is_active = 1
            ORDER BY r.level_hierarchy DESC
        ", [$userId])->getResultArray();
        
        return $roles;
    }
    
    /**
     * Check if user can access plant/area
     */
    public function canAccessPlant(int $userId, int $plantId): bool
    {
        $access = $this->db->query("
            SELECT COUNT(*) as count
            FROM user_roles ur
            WHERE ur.user_id = ? 
                AND (ur.plant_id IS NULL OR ur.plant_id = ?)
                AND ur.is_active = 1
                AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
        ", [$userId, $plantId])->getRow();
        
        return $access->count > 0;
    }
    
    /**
     * Get accessible plants for user
     */
    public function getAccessiblePlants(int $userId): array
    {
        $plants = $this->db->query("
            SELECT DISTINCT p.id, p.plant_code, p.plant_name
            FROM user_roles ur
            LEFT JOIN plants p ON ur.plant_id = p.id OR ur.plant_id IS NULL
            WHERE ur.user_id = ? 
                AND ur.is_active = 1
                AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
                AND (p.id IS NOT NULL OR ur.plant_id IS NULL)
        ", [$userId])->getResultArray();
        
        // If user has global access (plant_id IS NULL), return all plants
        $hasGlobalAccess = $this->db->query("
            SELECT COUNT(*) as count
            FROM user_roles ur
            WHERE ur.user_id = ? 
                AND ur.plant_id IS NULL
                AND ur.is_active = 1
        ", [$userId])->getRow()->count > 0;
        
        if ($hasGlobalAccess) {
            return $this->db->table('plants')
                           ->where('is_active', 1)
                           ->get()
                           ->getResultArray();
        }
        
        return $plants;
    }
    
    /**
     * Log role change for audit
     */
    private function logRoleChange(int $userId, int $roleId, string $action, int $actionBy): void
    {
        $role = $this->db->table('roles')->where('id', $roleId)->get()->getRow();
        $user = $this->db->table('users')->where('id', $userId)->get()->getRow();
        
        $auditData = [
            'id' => $this->generateUuid(),
            'table_name' => 'user_roles',
            'record_id' => $userId,
            'action' => 'update',
            'new_values' => json_encode([
                'action' => $action,
                'role' => $role->role_name,
                'user' => $user->username
            ]),
            'user_id' => $actionBy,
            'checksum' => $this->generateChecksum('user_roles', $userId, $action)
        ];
        
        $this->db->table('audit_log')->insert($auditData);
    }
    
    /**
     * Log permission override for audit
     */
    private function logPermissionOverride(int $userId, string $permissionCode, string $action, int $actionBy, string $reason): void
    {
        $auditData = [
            'id' => $this->generateUuid(),
            'table_name' => 'permission_overrides',
            'record_id' => $userId,
            'action' => 'create',
            'new_values' => json_encode([
                'permission' => $permissionCode,
                'action' => $action,
                'reason' => $reason
            ]),
            'user_id' => $actionBy,
            'checksum' => $this->generateChecksum('permission_overrides', $userId, $action)
        ];
        
        $this->db->table('audit_log')->insert($auditData);
    }
    
    /**
     * Generate checksum for audit trail
     */
    private function generateChecksum(string $table, string $recordId, string $action): string
    {
        $data = $table . $recordId . $action . time();
        return hash('sha256', $data);
    }
    
    /**
     * Generate UUID
     */
    private function generateUuid(): string
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}