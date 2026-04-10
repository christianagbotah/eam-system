<?php

namespace App\Repositories;

class EamRoleRepository extends BaseRepository
{
    protected $table = 'permissions';

    public function assignPermissions($roleId, $permissionIds)
    {
        $this->db->table('role_permissions')->where('role_id', $roleId)->delete();
        
        $data = array_map(fn($pid) => ['role_id' => $roleId, 'permission_id' => $pid], $permissionIds);
        
        return $this->db->table('role_permissions')->insertBatch($data);
    }
}
