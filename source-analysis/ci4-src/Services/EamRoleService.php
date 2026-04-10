<?php

namespace App\Services;

use App\Repositories\EamRoleRepository;

class EamRoleService
{
    protected $repo;

    public function __construct()
    {
        $this->repo = new EamRoleRepository();
    }

    public function getAll($params)
    {
        return $this->repo->paginate($params['page'] ?? 1, $params['limit'] ?? 20);
    }

    public function getById($id)
    {
        $data = $this->repo->find($id);
        return $data ? ['status' => 'success', 'data' => $data] : ['status' => 'error', 'message' => 'Not found'];
    }

    public function create($data)
    {
        $id = $this->repo->create($data);
        return $id ? ['status' => 'success', 'data' => ['id' => $id]] : ['status' => 'error', 'message' => 'Creation failed'];
    }

    public function update($id, $data)
    {
        $result = $this->repo->update($id, $data);
        return $result ? ['status' => 'success', 'message' => 'Updated'] : ['status' => 'error', 'message' => 'Update failed'];
    }

    public function delete($id)
    {
        $result = $this->repo->delete($id);
        return $result ? ['status' => 'success', 'message' => 'Deleted'] : ['status' => 'error', 'message' => 'Delete failed'];
    }

    public function assignPermissions($roleId, $permissionIds)
    {
        $result = $this->repo->assignPermissions($roleId, $permissionIds);
        return $result ? ['status' => 'success', 'message' => 'Permissions assigned'] : ['status' => 'error', 'message' => 'Assignment failed'];
    }
}
