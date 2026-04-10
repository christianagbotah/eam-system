<?php

namespace App\Repositories;

class PmSchedulingRepository extends BaseRepository
{
    protected $table = 'pm_schedules';

    public function getDueTimeBasedSchedules($date)
    {
        return $this->db->table('pm_schedules s')
            ->select('s.*, r.trigger_type, r.frequency_value, r.frequency_unit')
            ->join('pm_rules r', 's.pm_rule_id = r.id')
            ->where('r.trigger_type', 'time')
            ->where('s.scheduled_date <=', $date)
            ->where('s.status', 'pending')
            ->get()->getResultArray();
    }

    public function getDueUsageBasedSchedules()
    {
        $sql = "
            SELECT s.id, s.pm_rule_id, s.asset_id, s.scheduled_date, s.status,
                   r.meter_id, r.meter_threshold, 
                   COALESCE(mr.reading_value, 0) as current_reading
            FROM pm_schedules s
            JOIN pm_rules r ON s.pm_rule_id = r.id
            LEFT JOIN (
                SELECT meter_id, asset_id, reading_value,
                       ROW_NUMBER() OVER (PARTITION BY meter_id, asset_id ORDER BY reading_date DESC) as rn
                FROM meter_readings
            ) mr ON mr.meter_id = r.meter_id AND mr.asset_id = s.asset_id AND mr.rn = 1
            WHERE r.trigger_type = 'usage'
            AND s.status = 'pending'
            AND COALESCE(mr.reading_value, 0) >= r.meter_threshold
        ";
        return $this->db->query($sql)->getResultArray();
    }

    public function getDueMixedSchedules($date)
    {
        $sql = "
            SELECT s.id, s.pm_rule_id, s.asset_id, s.scheduled_date, s.status,
                   r.meter_id, r.meter_threshold, r.frequency_value, r.frequency_unit,
                   COALESCE(mr.reading_value, 0) as current_reading
            FROM pm_schedules s
            JOIN pm_rules r ON s.pm_rule_id = r.id
            LEFT JOIN (
                SELECT meter_id, asset_id, reading_value,
                       ROW_NUMBER() OVER (PARTITION BY meter_id, asset_id ORDER BY reading_date DESC) as rn
                FROM meter_readings
            ) mr ON mr.meter_id = r.meter_id AND mr.asset_id = s.asset_id AND mr.rn = 1
            WHERE r.trigger_type = 'mixed'
            AND s.status = 'pending'
            AND (s.scheduled_date <= ? OR COALESCE(mr.reading_value, 0) >= r.meter_threshold)
        ";
        return $this->db->query($sql, [$date])->getResultArray();
    }

    public function getOverdueSchedules($date)
    {
        return $this->db->table('pm_schedules')
            ->where('scheduled_date <', $date)
            ->where('status', 'pending')
            ->get()->getResultArray();
    }

    public function getPmRule($ruleId)
    {
        return $this->db->table('pm_rules')->where('id', $ruleId)->get()->getRowArray();
    }

    public function getCurrentMeterReading($assetId, $meterId)
    {
        $result = $this->db->table('meter_readings')
            ->where('asset_id', $assetId)
            ->where('meter_id', $meterId)
            ->orderBy('reading_date', 'DESC')
            ->limit(1)
            ->get()->getRowArray();
        
        return $result['reading_value'] ?? 0;
    }

    public function createWorkOrder($data)
    {
        $this->db->table('work_orders')->insert($data);
        return $this->db->insertID();
    }

    public function updateScheduleStatus($scheduleId, $status, $workOrderId = null)
    {
        $data = ['status' => $status, 'updated_at' => date('Y-m-d H:i:s')];
        if ($workOrderId) $data['work_order_id'] = $workOrderId;
        
        $this->db->table('pm_schedules')->where('id', $scheduleId)->update($data);
    }

    public function updateScheduleEscalation($scheduleId, $level)
    {
        $this->db->table('pm_schedules')->where('id', $scheduleId)->update([
            'escalation_level' => $level,
            'escalated_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function createEscalationNotification($data)
    {
        $this->db->table('audit_logs')->insert([
            'table_name' => 'pm_schedules',
            'record_id' => $data['schedule_id'],
            'action' => 'escalation',
            'old_values' => json_encode(['level' => $data['level'] - 1]),
            'new_values' => json_encode($data),
            'created_at' => date('Y-m-d H:i:s')
        ]);
        return true;
    }

    public function createSchedule($data)
    {
        $this->db->table('pm_schedules')->insert($data);
        return $this->db->insertID();
    }
}
