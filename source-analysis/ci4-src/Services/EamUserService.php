<?php

namespace App\Services;

use App\Repositories\EamUserRepository;

class EamUserService
{
    protected $repo;

    public function __construct()
    {
        $this->repo = new EamUserRepository();
    }

    public function getAll($params)
    {
        if (isset($params['role'])) {
            $plannerType = $params['planner_type'] ?? null;
            return $this->repo->findByRole($params['role'], $plannerType);
        }
        return $this->repo->paginate($params['page'] ?? 1, $params['limit'] ?? 20, $params['search'] ?? '');
    }

    public function getById($id)
    {
        $data = $this->repo->find($id);
        return $data ? ['status' => 'success', 'data' => $data] : ['status' => 'error', 'message' => 'Not found'];
    }

    public function create($data)
    {
        $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        $id = $this->repo->create($data);
        return $id ? ['status' => 'success', 'data' => ['id' => $id]] : ['status' => 'error', 'message' => 'Creation failed'];
    }

    public function update($id, $data)
    {
        if (isset($data['password']) && !empty($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_DEFAULT);
        } else {
            unset($data['password']);
        }
        
        $result = $this->repo->update($id, $data);
        return $result ? ['status' => 'success', 'message' => 'Updated'] : ['status' => 'error', 'message' => 'Update failed'];
    }

    public function delete($id)
    {
        $result = $this->repo->delete($id);
        return $result ? ['status' => 'success', 'message' => 'Deleted'] : ['status' => 'error', 'message' => 'Delete failed'];
    }

    public function assignRole($userId, $roleId)
    {
        $result = $this->repo->assignRole($userId, $roleId);
        return $result ? ['status' => 'success', 'message' => 'Role assigned'] : ['status' => 'error', 'message' => 'Assignment failed'];
    }
}
