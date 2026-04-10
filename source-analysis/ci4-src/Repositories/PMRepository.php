<?php

namespace App\Repositories;

class PMRepository
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function findRule($pmRuleId)
    {
        // SELECT * FROM pm_rules WHERE id = ?
        return $this->db->table('pm_rules')->where('id', $pmRuleId)->get()->getRowArray();
    }

    public function getActiveRules()
    {
        // SELECT * FROM pm_rules WHERE is_active = 1
        return $this->db->table('pm_rules')->where('is_active', 1)->get()->getResultArray();
    }

    public function getLastCompletedSchedule($pmRuleId)
    {
        // SELECT * FROM pm_schedules WHERE pm_rule_id = ? AND status = 'completed' ORDER BY completed_date DESC LIMIT 1
        return $this->db->table('pm_schedules')
            ->where('pm_rule_id', $pmRuleId)
            ->where('status', 'completed')
            ->orderBy('completed_date', 'DESC')
            ->limit(1)
            ->get()->getRowArray();
    }

    public function findSchedule($scheduleId)
    {
        // SELECT * FROM pm_schedules WHERE id = ?
        return $this->db->table('pm_schedules')->where('id', $scheduleId)->get()->getRowArray();
    }

    public function scheduleExists($pmRuleId, $scheduledDate)
    {
        // SELECT id FROM pm_schedules WHERE pm_rule_id = ? AND scheduled_date = ?
        return $this->db->table('pm_schedules')
            ->where('pm_rule_id', $pmRuleId)
            ->where('scheduled_date', $scheduledDate)
            ->countAllResults() > 0;
    }

    public function createSchedule($data)
    {
        // INSERT INTO pm_schedules (pm_rule_id, equipment_id, scheduled_date, status, created_at)
        $this->db->table('pm_schedules')->insert($data);
        return $this->db->insertID();
    }

    public function updateSchedule($scheduleId, $data)
    {
        // UPDATE pm_schedules SET ... WHERE id = ?
        $this->db->table('pm_schedules')->where('id', $scheduleId)->update($data);
    }

    public function createWorkOrder($data)
    {
        // INSERT INTO work_orders (title, description, equipment_id, pm_schedule_id, priority, work_type, status, created_at)
        $this->db->table('work_orders')->insert($data);
        return $this->db->insertID();
    }
}
