<?php
namespace App\Services\RWOP;

class RwopKpiSnapshotService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    public function createSnapshot(int $workOrderId, int $userId): int
    {
        $wo = $this->db->table('work_orders')->where('id', $workOrderId)->get()->getRowArray();
        
        if ($wo['status'] !== 'closed') {
            throw new \Exception('Can only create snapshot for closed work orders');
        }
        
        $createdAt = strtotime($wo['created_at']);
        $closedAt = strtotime($wo['updated_at']);
        $actualStart = $wo['actual_start'] ? strtotime($wo['actual_start']) : null;
        $actualEnd = $wo['actual_end'] ? strtotime($wo['actual_end']) : null;
        
        $responseTime = $actualStart ? round(($actualStart - $createdAt) / 60) : null;
        $resolutionTime = round(($closedAt - $createdAt) / 60);
        $workDuration = ($actualStart && $actualEnd) ? round(($actualEnd - $actualStart) / 60) : null;
        
        $waitingTime = $this->calculateWaitingTime($workOrderId);
        $laborMetrics = $this->getLaborMetrics($workOrderId);
        $partsCount = $this->db->table('work_order_materials')->where('work_order_id', $workOrderId)->countAllResults();
        
        $failure = $this->db->table('rwop_wo_failure_analysis fa')
            ->select('fm.name as mode, fc.name as cause, fa.failure_classification')
            ->join('rwop_failure_modes fm', 'fm.id = fa.failure_mode_id')
            ->join('rwop_failure_causes fc', 'fc.id = fa.failure_cause_id')
            ->where('fa.work_order_id', $workOrderId)
            ->where('fa.is_primary', 1)
            ->get()->getRowArray();
        
        $costVariance = $wo['actual_cost'] - ($wo['estimated_cost'] ?? 0);
        $costVariancePercent = $wo['estimated_cost'] > 0 ? round(($costVariance / $wo['estimated_cost']) * 100, 2) : 0;
        
        $slaMet = $wo['sla_due_date'] ? (strtotime($wo['sla_due_date']) >= $closedAt) : null;
        $slaBreachMinutes = $wo['sla_due_date'] && !$slaMet ? round(($closedAt - strtotime($wo['sla_due_date'])) / 60) : 0;
        
        return $this->db->table('rwop_wo_kpi_snapshots')->insert([
            'work_order_id' => $workOrderId,
            'plant_id' => $wo['plant_id'],
            'asset_id' => $wo['asset_id'],
            'wo_type' => $wo['wo_type'],
            'priority' => $wo['priority'],
            'created_at' => $wo['created_at'],
            'closed_at' => date('Y-m-d H:i:s'),
            'response_time_minutes' => $responseTime,
            'resolution_time_minutes' => $resolutionTime,
            'work_duration_minutes' => $workDuration,
            'waiting_time_minutes' => $waitingTime,
            'mttr_hours' => $workDuration ? round($workDuration / 60, 2) : null,
            'mtta_hours' => $responseTime ? round($responseTime / 60, 2) : null,
            'sla_due_date' => $wo['sla_due_date'],
            'sla_met' => $slaMet,
            'sla_breach_minutes' => $slaBreachMinutes,
            'final_labor_cost' => $wo['labor_cost'],
            'final_material_cost' => $wo['material_cost'],
            'final_contractor_cost' => $wo['contractor_cost'],
            'final_total_cost' => $wo['actual_cost'],
            'estimated_cost' => $wo['estimated_cost'],
            'cost_variance' => $costVariance,
            'cost_variance_percent' => $costVariancePercent,
            'downtime_minutes' => $wo['downtime_minutes'],
            'technician_count' => $laborMetrics['count'],
            'total_labor_hours' => $laborMetrics['hours'],
            'parts_count' => $partsCount,
            'first_time_fix' => ($wo['reopen_count'] ?? 0) === 0,
            'rework_required' => ($wo['reopen_count'] ?? 0) > 0,
            'verification_passed' => $wo['verification_status'] === 'passed',
            'failure_mode' => $failure['mode'] ?? null,
            'failure_cause' => $failure['cause'] ?? null,
            'failure_classification' => $failure['failure_classification'] ?? null,
            'snapshot_created_by' => $userId
        ]);
    }
    
    private function calculateWaitingTime(int $workOrderId): int
    {
        return 0;
    }
    
    private function getLaborMetrics(int $workOrderId): array
    {
        $result = $this->db->table('work_order_labor')
            ->selectSum('hours_worked', 'total_hours')
            ->selectCount('id', 'count')
            ->where('work_order_id', $workOrderId)
            ->get()->getRowArray();
        
        return [
            'hours' => $result['total_hours'] ?? 0,
            'count' => $result['count'] ?? 0
        ];
    }
}
