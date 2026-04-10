<?php

namespace App\Controllers;

use App\Models\PmPartTaskModel;
use App\Models\PmScheduleNewModel;
use App\Models\PmWorkOrderModel;
use App\Models\PartsModel;
use App\Models\EquipmentModel;

class PMSystem extends BaseController
{
    protected $pmPartTaskModel;
    protected $pmScheduleModel;
    protected $pmWorkOrderModel;
    protected $partsModel;
    protected $equipmentModel;

    public function __construct()
    {
        $this->pmPartTaskModel = new PmPartTaskModel();
        $this->pmScheduleModel = new PmScheduleNewModel();
        $this->pmWorkOrderModel = new PmWorkOrderModel();
        $this->partsModel = new PartsModel();
        $this->equipmentModel = new EquipmentModel();
    }

    // Assign PM tasks to parts
    public function assignTaskToPart($partId = null)
    {
        if ($this->request->getMethod() === 'POST') {
            $data = [
                'part_id' => $this->request->getPost('part_id'),
                'task_name' => $this->request->getPost('task_name'),
                'task_description' => $this->request->getPost('task_description'),
                'frequency_value' => $this->request->getPost('frequency_value'),
                'frequency_unit' => $this->request->getPost('frequency_unit'),
                'estimated_duration_minutes' => $this->request->getPost('estimated_duration_minutes'),
                'priority' => $this->request->getPost('priority'),
                'is_active' => 1
            ];

            if ($this->pmPartTaskModel->insert($data)) {
                return redirect()->to('/pm-system/part-tasks/' . $data['part_id'])
                    ->with('success', 'PM task assigned successfully');
            }
            return redirect()->back()->with('error', 'Failed to assign PM task');
        }

        $data['part'] = $this->partsModel->find($partId);
        return view('maintenance/assign_pm_task', $data);
    }

    // Schedule PM for equipment parts
    public function scheduleEquipmentPM($equipmentId)
    {
        if ($this->request->getMethod() === 'POST') {
            $partTaskIds = $this->request->getPost('part_task_ids');
            $startDate = $this->request->getPost('start_date');

            $schedules = [];
            foreach ($partTaskIds as $partTaskId) {
                $task = $this->pmPartTaskModel->find($partTaskId);
                if ($task) {
                    $nextDueDate = $this->calculateNextDueDate($startDate, $task['frequency_value'], $task['frequency_unit']);
                    
                    $schedules[] = [
                        'part_task_id' => $partTaskId,
                        'equipment_id' => $equipmentId,
                        'part_id' => $task['part_id'],
                        'start_date' => $startDate,
                        'next_due_date' => $nextDueDate,
                        'status' => 'scheduled'
                    ];
                }
            }

            if (!empty($schedules)) {
                $this->pmScheduleModel->insertBatch($schedules);
                return redirect()->to('/pm-system/equipment-schedules/' . $equipmentId)
                    ->with('success', 'PM schedules created successfully');
            }
        }

        $data['equipment'] = $this->equipmentModel->find($equipmentId);
        $data['tasks'] = $this->pmPartTaskModel->getTasksWithPartInfo($equipmentId);
        return view('maintenance/schedule_equipment_pm', $data);
    }

    // Generate work orders for due maintenance
    public function generateWorkOrders($equipmentId = null)
    {
        $count = $this->pmWorkOrderModel->generateWorkOrdersFromSchedules($equipmentId);
        
        if ($equipmentId) {
            return redirect()->to('/pm-system/work-orders/' . $equipmentId)
                ->with('success', "$count work orders generated");
        }
        
        return redirect()->to('/pm-system/work-orders')
            ->with('success', "$count work orders generated");
    }

    // View work orders for equipment
    public function workOrders($equipmentId = null)
    {
        if ($equipmentId) {
            $data['equipment'] = $this->equipmentModel->find($equipmentId);
            $data['workOrders'] = $this->pmWorkOrderModel->getWorkOrdersByEquipment($equipmentId);
        } else {
            $data['workOrders'] = $this->pmWorkOrderModel
                ->select('pm_work_orders.*, equipment.name as equipment_name, parts.name as part_name')
                ->join('equipment', 'pm_work_orders.equipment_id = equipment.id')
                ->join('parts', 'pm_work_orders.part_id = parts.id')
                ->orderBy('scheduled_date', 'ASC')
                ->findAll();
        }
        
        return view('maintenance/work_orders_list', $data);
    }

    // Complete work order
    public function completeWorkOrder($workOrderId)
    {
        if ($this->request->getMethod() === 'POST') {
            $data = [
                'completed_date' => $this->request->getPost('completed_date'),
                'actual_duration_minutes' => $this->request->getPost('actual_duration_minutes'),
                'completion_notes' => $this->request->getPost('completion_notes')
            ];

            if ($this->pmWorkOrderModel->completeWorkOrder($workOrderId, $data)) {
                return redirect()->back()->with('success', 'Work order completed successfully');
            }
            return redirect()->back()->with('error', 'Failed to complete work order');
        }

        $data['workOrder'] = $this->pmWorkOrderModel->find($workOrderId);
        return view('maintenance/complete_work_order', $data);
    }

    private function calculateNextDueDate($startDate, $frequencyValue, $frequencyUnit)
    {
        $date = new \DateTime($startDate);
        
        switch ($frequencyUnit) {
            case 'days':
                $date->modify("+{$frequencyValue} days");
                break;
            case 'weeks':
                $date->modify("+{$frequencyValue} weeks");
                break;
            case 'months':
                $date->modify("+{$frequencyValue} months");
                break;
            case 'years':
                $date->modify("+{$frequencyValue} years");
                break;
        }

        return $date->format('Y-m-d');
    }
}
