<?php
namespace App\Services\RWOP;

class RwopEnumService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    public function getMrStatuses(): array
    {
        return $this->db->table('rwop_mr_status_enum')
            ->where('is_active', 1)
            ->orderBy('display_order', 'ASC')
            ->get()->getResultArray();
    }
    
    public function getWoStatuses(): array
    {
        return $this->db->table('rwop_wo_status_enum')
            ->where('is_active', 1)
            ->orderBy('display_order', 'ASC')
            ->get()->getResultArray();
    }
    
    public function getFailureModes(int $plantId = null): array
    {
        $builder = $this->db->table('rwop_failure_modes')
            ->where('is_active', 1)
            ->where('retired_at IS NULL');
        
        if ($plantId) {
            $builder->groupStart()
                ->where('plant_id', $plantId)
                ->orWhere('plant_id IS NULL')
            ->groupEnd();
        }
        
        return $builder->orderBy('category', 'ASC')
            ->orderBy('name', 'ASC')
            ->get()->getResultArray();
    }
    
    public function getFailureCauses(int $modeId = null): array
    {
        $builder = $this->db->table('rwop_failure_causes')
            ->where('is_active', 1)
            ->where('retired_at IS NULL');
        
        if ($modeId) {
            $builder->where('failure_mode_id', $modeId);
        }
        
        return $builder->orderBy('name', 'ASC')->get()->getResultArray();
    }
    
    public function getFailureRemedies(int $causeId = null): array
    {
        $builder = $this->db->table('rwop_failure_remedies')
            ->where('is_active', 1)
            ->where('retired_at IS NULL');
        
        if ($causeId) {
            $builder->where('failure_cause_id', $causeId);
        }
        
        return $builder->orderBy('name', 'ASC')->get()->getResultArray();
    }
    
    public function getEventTypes(): array
    {
        return $this->db->table('rwop_event_types')
            ->where('is_active', 1)
            ->orderBy('event_type', 'ASC')
            ->get()->getResultArray();
    }
}
