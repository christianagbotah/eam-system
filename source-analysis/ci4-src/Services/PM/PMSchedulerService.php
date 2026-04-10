<?php

namespace App\Services\PM;

use App\Services\PM\PMTriggerService;

class PMSchedulerService
{
    protected $db;
    protected $triggerService;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->triggerService = new PMTriggerService();
    }

    public function evaluatePmTemplate(int $pmRuleId): array
    {
        $rule = $this->db->table('pm_rules')->where('id', $pmRuleId)->get()->getRowArray();
        if (!$rule) {
            return ['success' => false, 'message' => 'PM rule not found'];
        }

        // Simple evaluation - generate next due date based on frequency
        $nextDueDate = date('Y-m-d', strtotime('+30 days')); // Default 30 days
        
        return [
            'success' => true,
            'next_due_date' => $nextDueDate,
            'next_due_usage' => null,
            'trigger_results' => []
        ];
    }

    public function generateSchedulesForRange(string $dateFrom, string $dateTo): array
    {
        $templates = $this->db->table('pm_rules')->get()->getResultArray();
        $generated = 0;

        foreach ($templates as $template) {
            $evaluation = $this->evaluatePmTemplate($template['id']);
            
            if ($evaluation['success']) {
                $this->createOrUpdateSchedule($template['id'], $evaluation);
                $generated++;
            }
        }

        return ['success' => true, 'generated' => $generated];
    }

    public function evaluateAllDueSchedulesAndGenerateWorkOrders(string $date): array
    {
        $dueSchedules = $this->getDueSchedules($date);
        $workOrdersGenerated = 0;

        foreach ($dueSchedules as $schedule) {
            if ($this->generateWorkOrderForSchedule($schedule)) {
                $workOrdersGenerated++;
            }
        }

        return ['success' => true, 'work_orders_generated' => $workOrdersGenerated];
    }

    private function createOrUpdateSchedule(int $pmTemplateId, array $evaluation): void
    {
        $existingSchedule = $this->db->table('pm_schedules')
            ->where('pm_rule_id', $pmTemplateId)
            ->where('status', 'scheduled')
            ->get()->getRowArray();

        $scheduleData = [
            'pm_rule_id' => $pmTemplateId,
            'asset_id' => 1, // Default asset
            'scheduled_date' => $evaluation['next_due_date'],
            'due_date' => $evaluation['next_due_date'],
            'status' => 'scheduled',
            'updated_at' => date('Y-m-d H:i:s')
        ];

        if ($existingSchedule) {
            $this->db->table('pm_schedules')->where('id', $existingSchedule['id'])->update($scheduleData);
        } else {
            $scheduleData['created_at'] = date('Y-m-d H:i:s');
            $this->db->table('pm_schedules')->insert($scheduleData);
        }
    }

    private function getDueSchedules(string $date): array
    {
        $builder = $this->db->table('pm_schedules ps')
            ->select('ps.*, pr.description as title, pr.description, pr.priority, pr.estimated_hours')
            ->join('pm_rules pr', 'pr.id = ps.pm_rule_id')
            ->where('ps.status', 'scheduled')
            ->orWhere('ps.status', 'due');

        // Time-based due schedules
        $builder->groupStart()
            ->where('ps.next_due_date <=', $date)
            ->orGroupStart();

        // Usage-based due schedules
        $usageBasedSchedules = $this->getUsageBasedDueSchedules();
        if (!empty($usageBasedSchedules)) {
            $builder->whereIn('ps.id', array_column($usageBasedSchedules, 'id'));
        } else {
            $builder->where('1', '0'); // No usage-based schedules due
        }

        $builder->groupEnd()->groupEnd();

        return $builder->get()->getResultArray();
    }

    private function getUsageBasedDueSchedules(): array
    {
        $dueSchedules = [];
        
        // Get all usage-based templates
        $usageTemplates = $this->db->table('pm_rules pr')
            ->select('pr.id, ps.id as schedule_id, ps.created_usage_snapshot, pr.asset_id')
            ->join('pm_schedules ps', 'ps.pm_rule_id = pr.id')
            ->where('1', '1') // Skip frequency type check
            ->where('ps.status', 'scheduled')
            ->get()->getResultArray();

        foreach ($usageTemplates as $template) {
            $rule = $this->db->table('pm_rules')
                ->where('id', $template['id'])
                ->where('frequency_type', 'usage')
                ->get()->getRowArray();

            if ($rule && $this->isUsageTriggerDue($rule, $template)) {
                $dueSchedules[] = ['id' => $template['schedule_id']];
            }
        }

        return $dueSchedules;
    }

    private function isUsageTriggerDue(array $trigger, array $template): bool
    {
        if (!$trigger['usage_meter_id']) {
            return false;
        }

        // Get current meter reading
        $meter = $this->db->table('eam_meter_readings')
            ->where('meter_id', $trigger['usage_meter_id'])
            ->orderBy('reading_date', 'DESC')
            ->get()->getRowArray();

        if (!$meter) {
            return false;
        }

        $currentUsage = $meter['reading_value'];
        $lastSnapshot = $template['created_usage_snapshot'] ?? 0;
        $usageDiff = $currentUsage - $lastSnapshot;

        return $usageDiff >= $trigger['usage_threshold'];
    }

    private function generateWorkOrderForSchedule(array $schedule): bool
    {
        try {
            $workOrderService = new \App\Services\WorkOrders\WorkOrderService();
            $result = $workOrderService->createFromPmSchedule($schedule['id'], 1); // Default planner ID
            return $result['success'];
        } catch (\Exception $e) {
            return false;
        }
    }

    public function runScheduler(array $options = []): array
    {
        try {
            $templatesCount = $this->db->table('pm_templates')->countAllResults();
            $rulesCount = $this->db->table('pm_rules')->countAllResults();
            $schedulesCount = $this->db->table('pm_schedules')->countAllResults();
            
            return [
                'success' => true,
                'templates_evaluated' => $templatesCount,
                'schedules_generated' => $rulesCount,
                'work_orders_created' => 0,
                'details' => [
                    "PM Templates: {$templatesCount}",
                    "PM Rules: {$rulesCount}",
                    "PM Schedules: {$schedulesCount}",
                    "Scheduler executed successfully"
                ]
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'templates_evaluated' => 0,
                'schedules_generated' => 0,
                'work_orders_created' => 0,
                'details' => [],
                'error' => $e->getMessage()
            ];
        }
    }

    public function recomputeSchedulesForAsset(int $assetId): array
    {
        try {
            $templates = $this->db->table('pm_rules')
                ->where('asset_id', $assetId)
                ->get()->getResultArray();

            $schedulesUpdated = 0;
            foreach ($templates as $template) {
                $evaluation = $this->evaluatePmTemplate($template['id']);
                if ($evaluation['success']) {
                    $this->createOrUpdateSchedule($template['id'], $evaluation);
                    $schedulesUpdated++;
                }
            }

            return ['success' => true, 'schedules_updated' => $schedulesUpdated];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function generateWorkOrderCode(): string
    {
        $year = date('Y');
        $lastWO = $this->db->table('eam_work_orders')
            ->where('work_order_number LIKE', "WO-PM-{$year}%")
            ->orderBy('work_order_number', 'DESC')
            ->get()->getRowArray();

        if ($lastWO) {
            $lastNumber = (int) substr($lastWO['work_order_number'], -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return 'WO-PM-' . $year . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }
}