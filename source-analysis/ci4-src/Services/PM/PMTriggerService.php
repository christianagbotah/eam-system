<?php

namespace App\Services\PM;

class PMTriggerService
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function evaluateTriggersForTemplate(int $pmTemplateId): array
    {
        $triggers = $this->db->table('pm_triggers')
            ->where('pm_template_id', $pmTemplateId)
            ->get()->getResultArray();

        $results = [];
        foreach ($triggers as $trigger) {
            $results[] = $this->evaluateTrigger($trigger);
        }

        return $results;
    }

    public function listTriggers(int $pmTemplateId): array
    {
        return $this->db->table('pm_triggers')
            ->where('pm_template_id', $pmTemplateId)
            ->get()->getResultArray();
    }

    private function evaluateTrigger(array $trigger): array
    {
        $result = [
            'trigger_id' => $trigger['id'],
            'trigger_type' => $trigger['trigger_type'],
            'is_due' => false,
            'next_due_date' => null,
            'next_due_usage' => null,
            'current_value' => null
        ];

        switch ($trigger['trigger_type']) {
            case 'time':
                $result = $this->evaluateTimeTrigger($trigger, $result);
                break;
            case 'usage':
                $result = $this->evaluateUsageTrigger($trigger, $result);
                break;
            case 'production':
                $result = $this->evaluateProductionTrigger($trigger, $result);
                break;
            case 'event':
                $result = $this->evaluateEventTrigger($trigger, $result);
                break;
        }

        return $result;
    }

    private function evaluateTimeTrigger(array $trigger, array $result): array
    {
        $schedule = $this->db->table('pm_schedules')
            ->where('pm_template_id', $trigger['pm_template_id'])
            ->get()->getRowArray();

        if ($schedule && $schedule['next_due_date']) {
            $result['next_due_date'] = $schedule['next_due_date'];
            $result['is_due'] = strtotime($schedule['next_due_date']) <= time();
        } else {
            // First time - set due date based on period
            $result['next_due_date'] = date('Y-m-d', strtotime("+{$trigger['period_days']} days"));
            $result['is_due'] = false;
        }

        return $result;
    }

    private function evaluateUsageTrigger(array $trigger, array $result): array
    {
        if (!$trigger['usage_meter_id']) {
            return $result;
        }

        // Get current meter reading
        $meter = $this->db->table('eam_meter_readings')
            ->where('meter_id', $trigger['usage_meter_id'])
            ->orderBy('reading_date', 'DESC')
            ->get()->getRowArray();

        if (!$meter) {
            return $result;
        }

        $result['current_value'] = $meter['reading_value'];

        // Get schedule to check last snapshot
        $schedule = $this->db->table('pm_schedules')
            ->where('pm_template_id', $trigger['pm_template_id'])
            ->get()->getRowArray();

        $lastSnapshot = $schedule['created_usage_snapshot'] ?? 0;
        $usageDiff = $meter['reading_value'] - $lastSnapshot;

        $result['is_due'] = $usageDiff >= $trigger['usage_threshold'];
        $result['next_due_usage'] = $lastSnapshot + $trigger['usage_threshold'];

        return $result;
    }

    private function evaluateProductionTrigger(array $trigger, array $result): array
    {
        // Get production metric value
        $production = $this->db->table('production')
            ->selectSum($trigger['production_metric'])
            ->get()->getRowArray();

        if (!$production) {
            return $result;
        }

        $currentValue = $production[$trigger['production_metric']] ?? 0;
        $result['current_value'] = $currentValue;

        // Get schedule to check last snapshot
        $schedule = $this->db->table('pm_schedules')
            ->where('pm_template_id', $trigger['pm_template_id'])
            ->get()->getRowArray();

        $lastSnapshot = $schedule['created_usage_snapshot'] ?? 0;
        $productionDiff = $currentValue - $lastSnapshot;

        $result['is_due'] = $productionDiff >= $trigger['usage_threshold'];
        $result['next_due_usage'] = $lastSnapshot + $trigger['usage_threshold'];

        return $result;
    }

    private function evaluateEventTrigger(array $trigger, array $result): array
    {
        // Event-based triggers would need custom logic based on event_name
        // For now, return not due
        $result['is_due'] = false;
        return $result;
    }
}