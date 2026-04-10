<?php

namespace App\Services\WorkOrders;

use App\Models\WorkOrder;

class WorkOrderSLAService
{
    protected $workOrderModel;

    public function __construct()
    {
        $this->workOrderModel = new WorkOrder();
    }

    public function checkSLA(int $workOrderId): array
    {
        $wo = $this->workOrderModel->find($workOrderId);
        if (!$wo) throw new \Exception('Work order not found');

        if (!$wo['sla_hours'] || !$wo['sla_started_at']) {
            return ['status' => 'no_sla', 'breached' => false];
        }

        $slaEnd = strtotime($wo['sla_started_at']) + ($wo['sla_hours'] * 3600);
        $now = time();
        $breached = $now > $slaEnd;

        if ($breached && !$wo['sla_breached_at']) {
            $this->workOrderModel->update($workOrderId, ['sla_breached_at' => date('Y-m-d H:i:s')]);
        }

        return [
            'status' => $breached ? 'breached' : 'active',
            'breached' => $breached,
            'sla_hours' => $wo['sla_hours'],
            'started_at' => $wo['sla_started_at'],
            'deadline' => date('Y-m-d H:i:s', $slaEnd),
            'remaining_hours' => max(0, ($slaEnd - $now) / 3600)
        ];
    }

    public function updateSLAHours(int $workOrderId, float $hours): void
    {
        $this->workOrderModel->update($workOrderId, ['sla_hours' => $hours]);
    }

    public function getBreachedWorkOrders(): array
    {
        return $this->workOrderModel
            ->whereNotNull('sla_breached_at')
            ->whereIn('status', ['assigned', 'in_progress', 'waiting_parts', 'on_hold'])
            ->findAll();
    }
}
