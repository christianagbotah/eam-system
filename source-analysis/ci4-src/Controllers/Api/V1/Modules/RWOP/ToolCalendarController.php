<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class ToolCalendarController extends ResourceController
{
    use ResponseTrait;

    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    // GET /api/v1/eam/tool-calendar/availability
    public function availability()
    {
        try {
            $startDate = $this->request->getGet('start_date') ?? date('Y-m-01');
            $endDate = $this->request->getGet('end_date') ?? date('Y-m-t');
            $toolId = $this->request->getGet('tool_id');
            $plantId = $this->request->getGet('plant_id') ?? 1;

            $builder = $this->db->table('tools t');
            $builder->select('t.id, t.name, t.code, t.category_id, tc.name as category_name');
            $builder->join('tool_categories tc', 'tc.id = t.category_id', 'left');
            $builder->where('t.plant_id', $plantId);
            $builder->where('t.status', 'ACTIVE');
            
            if ($toolId) {
                $builder->where('t.id', $toolId);
            }

            $tools = $builder->get()->getResultArray();

            foreach ($tools as &$tool) {
                // Get issued periods
                $issuedQuery = $this->db->table('tool_requests tr')
                    ->select('tr.issued_date, tr.expected_return_date, tr.actual_return_date, u.username as issued_to')
                    ->join('users u', 'u.id = tr.requested_by', 'left')
                    ->where('tr.tool_id', $tool['id'])
                    ->where('tr.status', 'ISSUED')
                    ->where("(tr.expected_return_date >= '$startDate' OR tr.actual_return_date IS NULL)")
                    ->where("tr.issued_date <= '$endDate'")
                    ->get()->getResultArray();

                // Get maintenance schedules
                $maintenanceQuery = $this->db->table('tool_maintenance_schedules tms')
                    ->select('tms.next_due_date, tms.maintenance_type, u.username as assigned_to')
                    ->join('users u', 'u.id = tms.assigned_to', 'left')
                    ->where('tms.tool_id', $tool['id'])
                    ->where('tms.status', 'ACTIVE')
                    ->where("tms.next_due_date BETWEEN '$startDate' AND '$endDate'")
                    ->get()->getResultArray();

                $tool['issued_periods'] = $issuedQuery;
                $tool['maintenance_schedules'] = $maintenanceQuery;
            }

            return $this->respond([
                'status' => 'success',
                'data' => $tools
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching calendar data: ' . $e->getMessage());
        }
    }

    // GET /api/v1/eam/tool-calendar/events
    public function events()
    {
        try {
            $startDate = $this->request->getGet('start_date') ?? date('Y-m-01');
            $endDate = $this->request->getGet('end_date') ?? date('Y-m-t');
            $plantId = $this->request->getGet('plant_id') ?? 1;

            $events = [];

            // Tool issuances
            $issuedTools = $this->db->table('tool_requests tr')
                ->select('tr.id, tr.tool_id, tr.issued_date as start_date, 
                         COALESCE(tr.actual_return_date, tr.expected_return_date) as end_date,
                         t.name as tool_name, u.username as user_name')
                ->join('tools t', 't.id = tr.tool_id')
                ->join('users u', 'u.id = tr.requested_by')
                ->where('tr.status', 'ISSUED')
                ->where('t.plant_id', $plantId)
                ->where("(tr.expected_return_date >= '$startDate' OR tr.actual_return_date IS NULL)")
                ->where("tr.issued_date <= '$endDate'")
                ->get()->getResultArray();

            foreach ($issuedTools as $issued) {
                $events[] = [
                    'id' => 'issued_' . $issued['id'],
                    'title' => $issued['tool_name'] . ' - ' . $issued['user_name'],
                    'start' => $issued['start_date'],
                    'end' => $issued['end_date'],
                    'type' => 'issued',
                    'color' => '#ef4444'
                ];
            }

            // Maintenance schedules
            $maintenance = $this->db->table('tool_maintenance_schedules tms')
                ->select('tms.id, tms.tool_id, tms.next_due_date as date,
                         tms.maintenance_type, t.name as tool_name, u.username as assigned_to')
                ->join('tools t', 't.id = tms.tool_id')
                ->join('users u', 'u.id = tms.assigned_to', 'left')
                ->where('tms.status', 'ACTIVE')
                ->where('t.plant_id', $plantId)
                ->where("tms.next_due_date BETWEEN '$startDate' AND '$endDate'")
                ->get()->getResultArray();

            foreach ($maintenance as $maint) {
                $events[] = [
                    'id' => 'maintenance_' . $maint['id'],
                    'title' => $maint['tool_name'] . ' - ' . ucfirst($maint['maintenance_type']),
                    'start' => $maint['date'],
                    'end' => $maint['date'],
                    'type' => 'maintenance',
                    'color' => '#f59e0b'
                ];
            }

            return $this->respond([
                'status' => 'success',
                'data' => $events
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error fetching calendar events: ' . $e->getMessage());
        }
    }

    // POST /api/v1/eam/tool-calendar/book
    public function book()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $validation = \Config\Services::validation();
            $validation->setRules([
                'tool_id' => 'required|integer',
                'start_date' => 'required|valid_date',
                'end_date' => 'required|valid_date',
                'purpose' => 'required|string|max_length[255]'
            ]);

            if (!$validation->run($data)) {
                return $this->fail($validation->getErrors());
            }

            // Check availability
            $conflicts = $this->db->table('tool_requests')
                ->where('tool_id', $data['tool_id'])
                ->where('status', 'ISSUED')
                ->groupStart()
                    ->where("issued_date <= '{$data['end_date']}'")
                    ->where("(actual_return_date IS NULL OR actual_return_date >= '{$data['start_date']}')")
                ->groupEnd()
                ->countAllResults();

            if ($conflicts > 0) {
                return $this->fail('Tool is not available for the selected period');
            }

            // Create booking (as pending request)
            $bookingData = [
                'tool_id' => $data['tool_id'],
                'requested_by' => session('user_id'),
                'request_date' => date('Y-m-d H:i:s'),
                'expected_return_date' => $data['end_date'],
                'purpose' => $data['purpose'],
                'status' => 'PENDING',
                'plant_id' => $data['plant_id'] ?? 1,
                'created_at' => date('Y-m-d H:i:s')
            ];

            $this->db->table('tool_requests')->insert($bookingData);

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Tool booking request created successfully'
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error creating booking: ' . $e->getMessage());
        }
    }
}