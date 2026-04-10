<?php

namespace App\Repositories;

use App\Models\AssemblyModel;

class AssemblyRepository
{
    protected $model;

    public function __construct()
    {
        $this->model = new AssemblyModel();
    }

    public function findByEquipment(int $equipmentId, array $params): array
    {
        $builder = $this->model->builder();
        $builder->where('equipment_id', $equipmentId);

        if ($params['search']) {
            $builder->like('assembly_name', $params['search']);
        }

        $total = $builder->countAllResults(false);
        $data = $builder->orderBy($params['sort_by'], $params['sort_order'])
            ->limit($params['per_page'], ($params['page'] - 1) * $params['per_page'])
            ->get()->getResultArray();

        return ['data' => $data, 'total' => $total];
    }

    public function findById(int $id): ?array
    {
        return $this->model->find($id);
    }

    public function create(array $data): ?int
    {
        return $this->model->insert($data) ? $this->model->getInsertID() : null;
    }
}
