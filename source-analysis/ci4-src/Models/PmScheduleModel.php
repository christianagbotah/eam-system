<?php

namespace App\Models;

class PmScheduleModel extends PlantScopedModel
{
    protected $table = 'pm_schedules';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'plant_id',
        'pm_rule_id',
        'asset_id',
        'scheduled_date',
        'due_date',
        'completed_date',
        'status',
        'work_order_id',
        'next_due_usage',
        'created_usage_snapshot'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getUpcomingSchedules($limit = 10)
    {
        return $this->where('status', 'scheduled')
            ->where('scheduled_date >=', date('Y-m-d'))
            ->orderBy('scheduled_date', 'ASC')
            ->limit($limit)
            ->findAll();
    }

    public function getOverdueSchedules()
    {
        return $this->whereIn('status', ['due', 'overdue'])
            ->where('due_date <', date('Y-m-d'))
            ->findAll();
    }
}
