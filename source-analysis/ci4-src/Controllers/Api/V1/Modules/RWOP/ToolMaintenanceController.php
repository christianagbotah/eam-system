<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;

class ToolMaintenanceController extends BaseApiController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    /**
     * Get maintenance schedules
     * GET /api/v1/eam/tool-maintenance/schedules
     */
    public function schedules()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;

            $schedules = $this->db->table('tool_maintenance_schedules tms')
                ->select('tms.*, t.tool_name, t.tool_code, t.category, u.username as assigned_to_name,
                         DATEDIFF(tms.next_due_date, CURDATE()) as days_until_due')
                ->join('tools t', 't.id = tms.tool_id')
                ->join('users u', 'u.id = tms.assigned_to', 'left')
                ->where('t.plant_id', $plantId)
                ->where('tms.is_active', 1)
                ->orderBy('tms.next_due_date', 'ASC')
                ->get()->getResultArray();

            return $this->respond(['status' => 'success', 'data' => $schedules]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch schedules: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create maintenance schedule
     * POST /api/v1/eam/tool-maintenance/schedules
     */
    public function createSchedule()
    {
        try {
            $data = $this->request->getJSON(true);

            $rules = [
                'tool_id' => 'required|integer',
                'maintenance_type' => 'required|in_list[CALIBRATION,INSPECTION,REPAIR,REPLACEMENT,CLEANING]',
                'frequency_days' => 'required|integer|greater_than[0]'
            ];

            if (!$this->validate($rules)) {
                return $this->fail($this->validator->getErrors(), 400);
            }

            $nextDueDate = isset($data['last_maintenance_date']) 
                ? date('Y-m-d', strtotime($data['last_maintenance_date'] . ' + ' . $data['frequency_days'] . ' days'))
                : date('Y-m-d', strtotime('+' . $data['frequency_days'] . ' days'));

            $scheduleData = [
                'tool_id' => $data['tool_id'],
                'maintenance_type' => $data['maintenance_type'],
                'frequency_days' => $data['frequency_days'],
                'last_maintenance_date' => $data['last_maintenance_date'] ?? null,
                'next_due_date' => $nextDueDate,
                'assigned_to' => $data['assigned_to'] ?? null,
                'instructions' => $data['instructions'] ?? null,
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            $this->db->table('tool_maintenance_schedules')->insert($scheduleData);
            $scheduleId = $this->db->insertID();

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Maintenance schedule created',
                'data' => ['id' => $scheduleId]
            ]);
        } catch (\Exception $e) {
            return $this->fail('Failed to create schedule: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Record maintenance completion
     * POST /api/v1/eam/tool-maintenance/records
     */
    public function recordMaintenance()
    {
        try {
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);

            $data = $this->request->getJSON(true);

            $rules = [
                'schedule_id' => 'required|integer',
                'maintenance_date' => 'required|valid_date',
                'status' => 'required|in_list[COMPLETED,FAILED,PARTIAL]'
            ];

            if (!$this->validate($rules)) {
                return $this->fail($this->validator->getErrors(), 400);
            }

            $this->db->transStart();

            // Get schedule details
            $schedule = $this->db->table('tool_maintenance_schedules')
                ->where('id', $data['schedule_id'])->get()->getRowArray();

            if (!$schedule) {
                return $this->fail('Schedule not found', 404);
            }

            // Calculate next due date
            $nextDueDate = date('Y-m-d', strtotime($data['maintenance_date'] . ' + ' . $schedule['frequency_days'] . ' days'));

            // Create maintenance record
            $recordData = [
                'schedule_id' => $data['schedule_id'],
                'tool_id' => $schedule['tool_id'],
                'maintenance_date' => $data['maintenance_date'],
                'performed_by' => $userId,
                'maintenance_type' => $schedule['maintenance_type'],
                'status' => $data['status'],
                'notes' => $data['notes'] ?? null,
                'cost' => $data['cost'] ?? null,
                'next_due_date' => $nextDueDate,
                'created_at' => date('Y-m-d H:i:s')
            ];

            $this->db->table('tool_maintenance_records')->insert($recordData);

            // Update schedule if maintenance was completed
            if ($data['status'] === 'COMPLETED') {
                $this->db->table('tool_maintenance_schedules')
                    ->where('id', $data['schedule_id'])
                    ->update([
                        'last_maintenance_date' => $data['maintenance_date'],
                        'next_due_date' => $nextDueDate,
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
            }

            $this->db->transComplete();

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Maintenance recorded successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail('Failed to record maintenance: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get overdue maintenance
     * GET /api/v1/eam/tool-maintenance/overdue
     */
    public function overdue()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;

            $overdue = $this->db->table('tool_maintenance_schedules tms')
                ->select('tms.*, t.tool_name, t.tool_code, t.category, u.username as assigned_to_name,
                         DATEDIFF(CURDATE(), tms.next_due_date) as days_overdue')
                ->join('tools t', 't.id = tms.tool_id')
                ->join('users u', 'u.id = tms.assigned_to', 'left')
                ->where('t.plant_id', $plantId)
                ->where('tms.is_active', 1)
                ->where('tms.next_due_date <', date('Y-m-d'))
                ->orderBy('days_overdue', 'DESC')
                ->get()->getResultArray();

            return $this->respond(['status' => 'success', 'data' => $overdue]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch overdue: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get maintenance history for a tool
     * GET /api/v1/eam/tool-maintenance/history/{tool_id}
     */
    public function history($toolId)
    {
        try {
            $history = $this->db->table('tool_maintenance_records tmr')
                ->select('tmr.*, u.username as performed_by_name')
                ->join('users u', 'u.id = tmr.performed_by', 'left')
                ->where('tmr.tool_id', $toolId)
                ->orderBy('tmr.maintenance_date', 'DESC')
                ->get()->getResultArray();

            return $this->respond(['status' => 'success', 'data' => $history]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch history: ' . $e->getMessage(), 500);
        }
    }
}