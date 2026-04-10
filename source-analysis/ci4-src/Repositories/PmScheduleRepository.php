<?php

namespace App\Repositories;

use App\Models\PmScheduleNewModel;

class PmScheduleRepository
{
    protected $model;

    public function __construct()
    {
        $this->model = new PmScheduleNewModel();
    }

    public function findAll(array $params): array
    {
        $builder = $this->model->builder();
        $builder->select('pm_schedules_new.*, equipment.equipment_name')
            ->join('equipment', 'equipment.id = pm_schedules_new.equipment_id', 'left');

        if ($params['search']) {
            $builder->like('pm_schedules_new.task_name', $params['search']);
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

    public function update(int $id, array $data): bool
    {
        return $this->model->update($id, $data);
    }

    public function delete(int $id): bool
    {
        return $this->model->delete($id);
    }

    public function getTasks(array $params): array
    {
        $builder = $this->model->builder();
        $builder->select('pm_schedules_new.*, equipment.equipment_name')
            ->join('equipment', 'equipment.id = pm_schedules_new.equipment_id', 'left')
            ->where('pm_schedules_new.is_active', 1);

        $total = $builder->countAllResults(false);
        $data = $builder->orderBy('next_due_date', 'ASC')
            ->limit($params['per_page'], ($params['page'] - 1) * $params['per_page'])
            ->get()->getResultArray();

        return ['data' => $data, 'total' => $total];
    }

    public function getDueSchedules(): array
    {
        return $this->model->where('next_due_date <=', date('Y-m-d'))
            ->where('is_active', 1)
            ->findAll();
    }

    public function updateNextDueDate(int $id): bool
    {
        $schedule = $this->model->find($id);
        if (!$schedule) return false;

        $nextDue = date('Y-m-d', strtotime($schedule['next_due_date'] . ' + ' . $schedule['frequency_value'] . ' ' . $schedule['frequency_unit']));
        return $this->model->update($id, ['next_due_date' => $nextDue, 'last_completed' => date('Y-m-d')]);
    }
}
