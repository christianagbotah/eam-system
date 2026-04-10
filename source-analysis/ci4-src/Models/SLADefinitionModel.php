<?php

namespace App\Models;

use CodeIgniter\Model;

class SLADefinitionModel extends Model
{
    protected $table = 'sla_definitions';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['name', 'priority', 'response_time_hours', 'resolution_time_hours', 'is_active'];
    protected $useTimestamps = true;
    protected $validationRules = [
        'name' => 'required|max_length[100]',
        'priority' => 'required|in_list[low,medium,high,critical]',
        'response_time_hours' => 'required|integer',
        'resolution_time_hours' => 'required|integer'
    ];

    public function getByPriority($priority)
    {
        return $this->where(['priority' => $priority, 'is_active' => 1])->first();
    }

    public function getActive()
    {
        return $this->where('is_active', 1)->findAll();
    }

    public function calculateDueDates($priority, $startTime = null)
    {
        $sla = $this->getByPriority($priority);
        if (!$sla) return null;

        $start = $startTime ? strtotime($startTime) : time();
        return [
            'response_due' => date('Y-m-d H:i:s', $start + ($sla['response_time_hours'] * 3600)),
            'resolution_due' => date('Y-m-d H:i:s', $start + ($sla['resolution_time_hours'] * 3600)),
            'sla_id' => $sla['id']
        ];
    }
}
