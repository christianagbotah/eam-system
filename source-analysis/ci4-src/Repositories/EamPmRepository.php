<?php

namespace App\Repositories;

class EamPmRepository extends BaseRepository
{
    protected $table = 'pm_rules';

    public function paginateRules($page, $limit)
    {
        return $this->paginate($page, $limit);
    }

    public function createRule($data)
    {
        return $this->create($data);
    }

    public function updateRule($id, $data)
    {
        return $this->update($id, $data);
    }

    public function generateSchedules($ruleId, $startDate, $endDate)
    {
        $rule = $this->find($ruleId);
        if (!$rule) return false;

        $schedules = [];
        $current = strtotime($startDate);
        $end = strtotime($endDate);
        $interval = $rule['frequency_value'] * 86400;

        while ($current <= $end) {
            $schedules[] = [
                'pm_rule_id' => $ruleId,
                'asset_id' => $rule['asset_id'],
                'scheduled_date' => date('Y-m-d', $current),
                'status' => 'pending'
            ];
            $current += $interval;
        }

        return $this->db->table('pm_schedules')->insertBatch($schedules);
    }

    public function getSchedulesByAsset($assetId, $page, $limit)
    {
        $offset = ($page - 1) * $limit;
        $data = $this->db->table('pm_schedules')->where('asset_id', $assetId)->limit($limit, $offset)->get()->getResultArray();
        $total = $this->db->table('pm_schedules')->where('asset_id', $assetId)->countAllResults();

        return [
            'status' => 'success',
            'data' => $data,
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total]
        ];
    }

    public function paginateSchedules($page, $limit)
    {
        $offset = ($page - 1) * $limit;
        $data = $this->db->table('pm_schedules')->limit($limit, $offset)->get()->getResultArray();
        $total = $this->db->table('pm_schedules')->countAllResults();

        return [
            'status' => 'success',
            'data' => $data,
            'pagination' => ['page' => $page, 'limit' => $limit, 'total' => $total]
        ];
    }

    public function generateScheduleFromRule($ruleId)
    {
        $rule = $this->find($ruleId);
        if (!$rule) return false;

        $schedule = [
            'pm_rule_id' => $ruleId,
            'asset_id' => $rule['asset_id'],
            'scheduled_date' => date('Y-m-d'),
            'status' => 'pending'
        ];

        return $this->db->table('pm_schedules')->insert($schedule);
    }

    public function recomputeNextDue($ruleId)
    {
        $rule = $this->find($ruleId);
        if (!$rule) return false;
        
        $meter = $this->db->table('meters')
            ->where('equipment_id', $rule['asset_id'])
            ->where('meter_type', $rule['frequency_type'] ?? 'hours')
            ->get()->getRowArray();
        
        if (!$meter) return false;
        
        $threshold = $rule['frequency_value'] ?? 100;
        $nextDue = $meter['current_reading'] + $threshold;
        
        return $this->db->table('pm_rules')
            ->where('id', $ruleId)
            ->update(['next_due_value' => $nextDue]);
    }
}
