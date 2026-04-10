<?php

namespace App\Repositories;

use App\Models\EquipmentModel;

class EquipmentRepository
{
    protected $model;

    public function __construct()
    {
        $this->model = new EquipmentModel();
    }

    public function findAll(array $params): array
    {
        $builder = $this->model->builder();
        $builder->select('equipment.*, equipment_categories.category_name')
            ->join('equipment_categories', 'equipment_categories.id = equipment.category_id', 'left');

        if ($params['search']) {
            $builder->like('equipment.equipment_name', $params['search']);
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
}
