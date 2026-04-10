<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class ToolQRController extends ResourceController
{
    use ResponseTrait;

    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    // GET /api/v1/eam/tool-qr/generate/{tool_id}
    public function generate($toolId)
    {
        try {
            $tool = $this->db->table('tools')
                ->select('id, code, name, category_id, status')
                ->where('id', $toolId)
                ->get()->getRowArray();

            if (!$tool) {
                return $this->failNotFound('Tool not found');
            }

            $qrData = [
                'type' => 'tool',
                'id' => $tool['id'],
                'code' => $tool['code'],
                'timestamp' => time()
            ];

            return $this->respond([
                'status' => 'success',
                'data' => [
                    'tool' => $tool,
                    'qr_data' => base64_encode(json_encode($qrData)),
                    'qr_url' => "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" . urlencode(json_encode($qrData))
                ]
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error generating QR code: ' . $e->getMessage());
        }
    }

    // POST /api/v1/eam/tool-qr/scan
    public function scan()
    {
        try {
            $data = $this->request->getJSON(true);
            
            if (!isset($data['qr_data'])) {
                return $this->fail('QR data is required');
            }

            $qrData = json_decode(base64_decode($data['qr_data']), true);
            
            if (!$qrData || $qrData['type'] !== 'tool') {
                return $this->fail('Invalid QR code');
            }

            $tool = $this->db->table('tools t')
                ->select('t.*, tc.name as category_name')
                ->join('tool_categories tc', 'tc.id = t.category_id', 'left')
                ->where('t.id', $qrData['id'])
                ->get()->getRowArray();

            if (!$tool) {
                return $this->failNotFound('Tool not found');
            }

            // Check current status
            $activeRequest = $this->db->table('tool_requests tr')
                ->select('tr.*, u.username as issued_to')
                ->join('users u', 'u.id = tr.requested_by', 'left')
                ->where('tr.tool_id', $tool['id'])
                ->where('tr.status', 'ISSUED')
                ->get()->getRowArray();

            return $this->respond([
                'status' => 'success',
                'data' => [
                    'tool' => $tool,
                    'is_available' => !$activeRequest,
                    'current_request' => $activeRequest,
                    'actions' => $this->getAvailableActions($tool, $activeRequest)
                ]
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error processing scan: ' . $e->getMessage());
        }
    }

    // POST /api/v1/eam/tool-qr/quick-checkout
    public function quickCheckout()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $validation = \Config\Services::validation();
            $validation->setRules([
                'tool_id' => 'required|integer',
                'purpose' => 'required|string|max_length[255]',
                'expected_return_date' => 'required|valid_date'
            ]);

            if (!$validation->run($data)) {
                return $this->fail($validation->getErrors());
            }

            // Check availability
            $activeRequest = $this->db->table('tool_requests')
                ->where('tool_id', $data['tool_id'])
                ->where('status', 'ISSUED')
                ->get()->getRowArray();

            if ($activeRequest) {
                return $this->fail('Tool is currently issued to another user');
            }

            // Create and auto-approve request
            $requestData = [
                'tool_id' => $data['tool_id'],
                'requested_by' => session('user_id'),
                'request_date' => date('Y-m-d H:i:s'),
                'expected_return_date' => $data['expected_return_date'],
                'purpose' => $data['purpose'],
                'status' => 'APPROVED',
                'approved_by' => session('user_id'),
                'approved_date' => date('Y-m-d H:i:s'),
                'plant_id' => $data['plant_id'] ?? 1,
                'created_at' => date('Y-m-d H:i:s')
            ];

            $requestId = $this->db->table('tool_requests')->insert($requestData);

            // Auto-issue
            $this->db->table('tool_requests')
                ->where('id', $this->db->insertID())
                ->update([
                    'status' => 'ISSUED',
                    'issued_by' => session('user_id'),
                    'issued_date' => date('Y-m-d H:i:s')
                ]);

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Tool checked out successfully',
                'request_id' => $this->db->insertID()
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error during checkout: ' . $e->getMessage());
        }
    }

    // POST /api/v1/eam/tool-qr/quick-checkin
    public function quickCheckin()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $validation = \Config\Services::validation();
            $validation->setRules([
                'tool_id' => 'required|integer',
                'condition' => 'required|in_list[GOOD,DAMAGED,NEEDS_MAINTENANCE]'
            ]);

            if (!$validation->run($data)) {
                return $this->fail($validation->getErrors());
            }

            // Find active request
            $activeRequest = $this->db->table('tool_requests')
                ->where('tool_id', $data['tool_id'])
                ->where('status', 'ISSUED')
                ->where('requested_by', session('user_id'))
                ->get()->getRowArray();

            if (!$activeRequest) {
                return $this->fail('No active checkout found for this tool');
            }

            // Update request
            $updateData = [
                'status' => 'RETURNED',
                'actual_return_date' => date('Y-m-d H:i:s'),
                'return_condition' => $data['condition'],
                'return_notes' => $data['notes'] ?? null
            ];

            $this->db->table('tool_requests')
                ->where('id', $activeRequest['id'])
                ->update($updateData);

            // Update tool status if damaged
            if ($data['condition'] === 'DAMAGED') {
                $this->db->table('tools')
                    ->where('id', $data['tool_id'])
                    ->update(['status' => 'DAMAGED']);
            }

            return $this->respond([
                'status' => 'success',
                'message' => 'Tool checked in successfully'
            ]);

        } catch (\Exception $e) {
            return $this->fail('Error during checkin: ' . $e->getMessage());
        }
    }

    private function getAvailableActions($tool, $activeRequest)
    {
        $actions = [];
        
        if (!$activeRequest) {
            $actions[] = 'checkout';
        } else if ($activeRequest['requested_by'] == session('user_id')) {
            $actions[] = 'checkin';
        }
        
        $actions[] = 'view_history';
        
        return $actions;
    }
}