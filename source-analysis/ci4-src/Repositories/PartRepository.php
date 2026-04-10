<?php

namespace App\Repositories;

use App\Models\PartsModel;

class PartRepository
{
    protected $model;

    public function __construct()
    {
        $this->model = new PartsModel();
    }

    public function findByAssembly(int $assemblyId, array $params): array
    {
        $builder = $this->model->builder();
        $builder->where('assembly_id', $assemblyId);

        if ($params['search']) {
            $builder->like('part_name', $params['search']);
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
