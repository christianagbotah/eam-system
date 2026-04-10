<?php

namespace App\Services;

use App\Repositories\EamEquipmentRepository;

class EamEquipmentService
{
    protected $repo;

    public function __construct()
    {
        $this->repo = new EamEquipmentRepository();
    }

    public function getAll($params)
    {
        return $this->repo->paginate($params['page'] ?? 1, $params['limit'] ?? 20, $params['search'] ?? '');
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
}
