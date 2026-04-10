<?php

namespace App\Models;

use CodeIgniter\Model;

class PmScheduleNewModel extends Model
{
    protected $table = 'pm_schedules';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'part_task_id', 'equipment_id', 'part_id', 'start_date', 
        'last_completed_date', 'next_due_date', 'status', 'accumulated_usage'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getDueSchedules($equipmentId = null, $date = null)
    {
        $date = $date ?? date('Y-m-d');
        
        $builder = $this->db->table('pm_schedules ps')
            ->select('ps.*, pt.task_name, pt.task_description, pt.estimated_duration, pt.frequency_value, pt.pm_trigger_id,
                     p.name as part_name, p.part_number, 
                     a.name as assembly_name, 
                     e.name as equipment_name, e.equipment_id,
                     tr.trigger_name')
            ->join('pm_part_tasks pt', 'ps.part_task_id = pt.id')
            ->join('parts p', 'ps.part_id = p.id')
            ->join('assemblies a', 'p.assembly_id = a.id')
            ->join('equipment e', 'ps.equipment_id = e.id')
            ->join('pm_trigger tr', 'pt.pm_trigger_id = tr.trigger_id', 'left')
            ->whereIn('ps.status', ['scheduled', 'due', 'overdue']);

        if ($equipmentId) {
            $builder->where('ps.equipment_id', $equipmentId);
        }

        $schedules = $builder->orderBy('ps.next_due_date', 'ASC')->get()->getResultArray();
        
        $dueSchedules = [];
        foreach ($schedules as $schedule) {
            if ($schedule['trigger_name'] === 'usage_base') {
                $accumulated = $this->getAccumulatedUsage($schedule['equipment_id'], $schedule['part_id'], $schedule['last_completed_date'] ?? $schedule['start_date']);
                if ($accumulated >= $schedule['frequency_value']) {
                    $schedule['accumulated_usage'] = $accumulated;
                    $dueSchedules[] = $schedule;
                }
            } else {
                if ($schedule['next_due_date'] <= $date) {
                    $dueSchedules[] = $schedule;
                }
            }
        }
        
        return $dueSchedules;
    }
    
    public function getAccumulatedUsage($equipmentId, $partId, $sinceDate)
    {
        $result = $this->db->table('production_survey')
            ->selectSum('usage_value', 'total')
            ->where('equipment_id', $equipmentId)
            ->where('part_id', $partId)
            ->where('survey_date >=', $sinceDate)
            ->get()->getRowArray();
        
        return $result['total'] ?? 0;
    }

    public function getSchedulesByEquipment($equipmentId)
    {
        $schedules = $this->db->table('pm_schedules ps')
            ->select('ps.*, pt.task_name, pt.frequency_value, pt.pm_trigger_id, p.name as part_name, p.part_number, tr.trigger_name')
            ->join('pm_part_tasks pt', 'ps.part_task_id = pt.id')
            ->join('parts p', 'ps.part_id = p.id')
            ->join('pm_trigger tr', 'pt.pm_trigger_id = tr.trigger_id', 'left')
            ->where('ps.equipment_id', $equipmentId)
            ->orderBy('ps.next_due_date', 'ASC')
            ->get()->getResultArray();
        
        foreach ($schedules as &$schedule) {
            if ($schedule['trigger_name'] === 'usage_base') {
                $schedule['accumulated_usage'] = $this->getAccumulatedUsage($equipmentId, $schedule['part_id'], $schedule['last_completed_date'] ?? $schedule['start_date']);
                $schedule['usage_percentage'] = ($schedule['accumulated_usage'] / $schedule['frequency_value']) * 100;
            }
        }
        
        return $schedules;
    }
    
    public function getApproachingUsageBasedPM($equipmentId = null, $threshold = 90)
    {
        $builder = $this->db->table('pm_schedules ps')
            ->select('ps.*, pt.task_name, pt.frequency_value, p.name as part_name, e.name as equipment_name')
            ->join('pm_part_tasks pt', 'ps.part_task_id = pt.id')
            ->join('parts p', 'ps.part_id = p.id')
            ->join('equipment e', 'ps.equipment_id = e.id')
            ->join('pm_trigger tr', 'pt.pm_trigger_id = tr.trigger_id')
            ->where('tr.trigger_name', 'usage_base')
            ->whereIn('ps.status', ['scheduled']);
        
        if ($equipmentId) {
            $builder->where('ps.equipment_id', $equipmentId);
        }
        
        $schedules = $builder->get()->getResultArray();
        $approaching = [];
        
        foreach ($schedules as $schedule) {
            $accumulated = $this->getAccumulatedUsage($schedule['equipment_id'], $schedule['part_id'], $schedule['last_completed_date'] ?? $schedule['start_date']);
            $percentage = ($accumulated / $schedule['frequency_value']) * 100;
            
            if ($percentage >= $threshold) {
                $schedule['accumulated_usage'] = $accumulated;
                $schedule['usage_percentage'] = $percentage;
                $approaching[] = $schedule;
            }
        }
        
        return $approaching;
    }

    public function updateScheduleStatus()
    {
        $today = date('Y-m-d');
        
        // Update to due
        $this->where('next_due_date <=', $today)
            ->where('status', 'scheduled')
            ->set(['status' => 'due'])
            ->update();
        
        // Update to overdue
        $this->where('next_due_date <', $today)
            ->where('status', 'due')
            ->set(['status' => 'overdue'])
            ->update();
    }

    public function calculateNextDueDate($schedule)
    {
        if (is_numeric($schedule)) {
            $schedule = $this->db->table('pm_schedules ps')
                ->select('ps.*')
                ->where('ps.id', $schedule)
                ->get()->getRowArray();
        }

        if (!$schedule) return null;

        $baseDate = $schedule['last_completed_date'] ?? $schedule['start_date'];
        $date = new \DateTime($baseDate);
        $date->modify("+30 days");

        return $date->format('Y-m-d');
    }
}
