<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\PM\PMSchedulerService;
use CodeIgniter\HTTP\ResponseInterface;

class PMSchedulesController extends BaseResourceController
{
    protected $schedulerService;
    protected $db;

    public function __construct()
    {
        $this->schedulerService = new PMSchedulerService();
        $this->db = \Config\Database::connect();
    }

    public function index(): ResponseInterface
    {
        try {
            $builder = $this->db->table('pm_schedules ps')
                ->select('ps.*, pt.title, pt.description, pt.priority, pt.maintenance_type')
                ->join('pm_templates pt', 'pt.id = ps.pm_rule_id', 'left');

            // Apply filters
            if ($status = $this->request->getGet('status')) {
                $builder->where('ps.status', $status);
            }

            if ($assetId = $this->request->getGet('asset_id')) {
                $builder->where('ps.asset_id', $assetId);
            }

            if ($from = $this->request->getGet('from')) {
                $builder->where('ps.due_date >=', $from);
            }

            if ($to = $this->request->getGet('to')) {
                $builder->where('ps.due_date <=', $to);
            }

            $schedules = $builder->orderBy('ps.due_date')->get()->getResultArray();

            return $this->respond([
                'success' => true,
                'data' => $schedules,
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function generateWorkOrder($id): ResponseInterface
    {
        try {
            $schedule = $this->db->table('pm_schedules ps')
                ->select('ps.*, pt.title, pt.description, pt.priority, pt.estimated_hours')
                ->join('pm_templates pt', 'pt.id = ps.pm_rule_id')
                ->where('ps.id', $id)
                ->get()->getRowArray();

            if (!$schedule) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Schedule not found'
                ], 404);
            }

            if (!in_array($schedule['status'], ['scheduled', 'due'])) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Schedule is not in a valid status for work order generation. Current status: ' . $schedule['status']
                ], 400);
            }

            $result = $this->generateWorkOrderForSchedule($schedule);

            return $this->respond([
                'success' => true,
                'data' => $result,
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update($id = null): ResponseInterface
    {
        try {
            $payload = $this->request->getJSON(true);
            $payload['updated_at'] = date('Y-m-d H:i:s');

            $result = $this->db->table('pm_schedules')->where('id', $id)->update($payload);

            if (!$result) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Schedule not found'
                ], 404);
            }

            // Log history
            if (isset($payload['status'])) {
                $this->db->table('pm_history')->insert([
                    'pm_schedule_id' => $id,
                    'action' => $payload['status'],
                    'comment' => $payload['comment'] ?? "Status changed to {$payload['status']}",
                    'performed_at' => date('Y-m-d H:i:s')
                ]);
            }

            return $this->respond([
                'success' => true,
                'data' => ['updated' => true],
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 400);
        }
    }

    public function history($id): ResponseInterface
    {
        try {
            $history = $this->db->table('pm_history ph')
                ->select('ph.*, u.username as performed_by_name')
                ->join('users u', 'u.id = ph.performed_by', 'left')
                ->where('ph.pm_schedule_id', $id)
                ->orderBy('ph.performed_at', 'DESC')
                ->get()->getResultArray();

            return $this->respond([
                'success' => true,
                'data' => $history,
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function generateWorkOrderForSchedule(array $schedule): array
    {
        $this->db->transStart();

        try {
            // Generate work order code
            $woCode = $this->generateWorkOrderCode();

            // Create work order
            $workOrderData = [
                'wo_number' => $woCode,
                'type' => 'inspection', // Using closest available type
                'title' => 'PM: ' . $schedule['title'],
                'description' => $schedule['description'],
                'asset_id' => $schedule['asset_id'],
                'related_pm_id' => $schedule['id'],
                'requestor_id' => 1, // Default admin user
                'priority' => $schedule['priority'],
                'status' => 'planned',
                'estimated_hours' => $schedule['estimated_hours'],
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            $this->db->table('work_orders')->insert($workOrderData);
            $workOrderId = $this->db->insertID();

            // Update schedule
            $this->db->table('pm_schedules')->where('id', $schedule['id'])->update([
                'status' => 'completed',
                'work_order_id' => $workOrderId,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Log history
            $this->db->table('pm_history')->insert([
                'pm_schedule_id' => $schedule['id'],
                'action' => 'work_order_generated',
                'comment' => "Work order {$woCode} generated",
                'performed_at' => date('Y-m-d H:i:s')
            ]);

            $this->db->transComplete();

            if ($this->db->transStatus() === false) {
                throw new \Exception('Failed to generate work order');
            }

            return [
                'work_order_id' => $workOrderId,
                'wo_number' => $woCode
            ];

        } catch (\Exception $e) {
            $this->db->transRollback();
            throw $e;
        }
    }

    private function generateWorkOrderCode(): string
    {
        $year = date('Y');
        $lastWO = $this->db->table('work_orders')
            ->where('wo_number LIKE', "WO-PM-{$year}%")
            ->orderBy('wo_number', 'DESC')
            ->get()->getRowArray();

        if ($lastWO) {
            $lastNumber = (int) substr($lastWO['wo_number'], -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return 'WO-PM-' . $year . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }
}
