<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;

class ToolTransferController extends BaseApiController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    private function generateTransferNumber()
    {
        $year = date('Y');
        $lastTransfer = $this->db->table('tool_transfers')
            ->like('transfer_number', "TT-{$year}-", 'after')
            ->orderBy('id', 'DESC')
            ->get()->getRowArray();
        
        $newNum = $lastTransfer ? ((int)substr($lastTransfer['transfer_number'], -4) + 1) : 1;
        return 'TT-' . $year . '-' . str_pad($newNum, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get all transfers (role-based filtering)
     * GET /api/v1/eam/tool-transfers
     */
    public function index()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? $jwtData->user_id ?? null) : ($jwtData['id'] ?? $jwtData['user_id'] ?? null);
            $userRole = is_object($jwtData) ? ($jwtData->role ?? null) : ($jwtData['role'] ?? null);

            $builder = $this->db->table('tool_transfers tt');
            $builder->select('tt.*, 
                u1.username as from_technician_name, u1.full_name as from_technician_full_name,
                u2.username as to_technician_name, u2.full_name as to_technician_full_name,
                u3.username as approved_by_name,
                (SELECT COUNT(*) FROM tool_transfer_items WHERE transfer_id = tt.id) as items_count');
            $builder->join('users u1', 'u1.id = tt.from_technician_id', 'left');
            $builder->join('users u2', 'u2.id = tt.to_technician_id', 'left');
            $builder->join('users u3', 'u3.id = tt.approved_by', 'left');
            $builder->where('tt.plant_id', $plantId);

            // Role-based filtering
            if ($userRole === 'technician') {
                $builder->groupStart();
                $builder->where('tt.from_technician_id', $userId);
                $builder->orWhere('tt.to_technician_id', $userId);
                $builder->groupEnd();
            } elseif (!in_array($userRole, ['admin', 'manager', 'shop-attendant', 'shop_attendant'])) {
                $builder->where('1=0', null, false);
            }

            $builder->orderBy('tt.created_at', 'DESC');
            $transfers = $builder->get()->getResultArray();

            // Get items for each transfer
            foreach ($transfers as &$transfer) {
                $items = $this->db->table('tool_transfer_items ti')
                    ->select('ti.*, t.tool_name, t.tool_code, t.category')
                    ->join('tools t', 't.id = ti.tool_id', 'left')
                    ->where('ti.transfer_id', $transfer['id'])
                    ->get()->getResultArray();
                $transfer['items'] = $items;
            }

            return $this->respond(['status' => 'success', 'data' => $transfers]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch transfers: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Create transfer request
     * POST /api/v1/eam/tool-transfers
     */
    public function create()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? $jwtData->user_id ?? null) : ($jwtData['id'] ?? $jwtData['user_id'] ?? null);

            $data = $this->request->getJSON(true);

            $rules = [
                'to_technician_id' => 'required|integer',
                'transfer_reason' => 'required|string',
                'tools' => 'required'
            ];

            if (!$this->validate($rules)) {
                return $this->fail($this->validator->getErrors(), 400);
            }

            if ($userId == $data['to_technician_id']) {
                return $this->fail('Cannot transfer tools to yourself', 400);
            }

            $this->db->transStart();

            $transferNumber = $this->generateTransferNumber();
            $headerData = [
                'transfer_number' => $transferNumber,
                'plant_id' => $plantId,
                'tool_request_id' => $data['tool_request_id'] ?? null,
                'from_technician_id' => $userId,
                'to_technician_id' => $data['to_technician_id'],
                'transfer_reason' => $data['transfer_reason'],
                'transfer_location' => $data['transfer_location'] ?? null,
                'transfer_status' => 'PENDING',
                'requested_at' => date('Y-m-d H:i:s'),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ];

            $this->db->table('tool_transfers')->insert($headerData);
            $transferId = $this->db->insertID();

            // Create items
            foreach ($data['tools'] as $tool) {
                $itemData = [
                    'transfer_id' => $transferId,
                    'tool_id' => $tool['tool_id'],
                    'quantity' => $tool['quantity'] ?? 1,
                    'condition_on_transfer' => $tool['condition'] ?? 'GOOD',
                    'notes' => $tool['notes'] ?? null,
                    'created_at' => date('Y-m-d H:i:s')
                ];
                $this->db->table('tool_transfer_items')->insert($itemData);
            }

            // Create notification for shop attendant
            $shopAttendants = $this->db->table('users')
                ->where('role', 'shop-attendant')
                ->orWhere('role', 'shop_attendant')
                ->get()->getResultArray();
            
            foreach ($shopAttendants as $attendant) {
                $this->db->table('notifications')->insert([
                    'user_id' => $attendant['id'],
                    'type' => 'TOOL_TRANSFER',
                    'title' => 'Tool Transfer Approval Required',
                    'message' => "Transfer request {$transferNumber} requires approval",
                    'reference_type' => 'tool_transfer',
                    'reference_id' => $transferId,
                    'is_read' => 0,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }

            // Notify receiving technician
            $this->db->table('notifications')->insert([
                'user_id' => $data['to_technician_id'],
                'type' => 'TOOL_TRANSFER',
                'title' => 'Incoming Tool Transfer',
                'message' => "You have a pending tool transfer {$transferNumber}",
                'reference_type' => 'tool_transfer',
                'reference_id' => $transferId,
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            $this->db->transComplete();

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Transfer request created successfully',
                'data' => ['id' => $transferId, 'transfer_number' => $transferNumber]
            ]);
        } catch (\Exception $e) {
            return $this->fail('Failed to create transfer: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Approve transfer (Shop Attendant)
     * POST /api/v1/eam/tool-transfers/{id}/approve
     */
    public function approve($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);

            $transfer = $this->db->table('tool_transfers')
                ->where('id', $id)->where('plant_id', $plantId)->get()->getRowArray();

            if (!$transfer || $transfer['transfer_status'] !== 'PENDING') {
                return $this->fail('Invalid transfer or already processed', 400);
            }

            $this->db->transStart();

            $this->db->table('tool_transfers')->where('id', $id)->update([
                'transfer_status' => 'APPROVED',
                'approved_by' => $userId,
                'approved_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Update tool issue logs - change issued_to from old to new technician
            $items = $this->db->table('tool_transfer_items')->where('transfer_id', $id)->get()->getResultArray();
            
            foreach ($items as $item) {
                // Find the latest issue log for this tool from the transferring technician
                $issueLog = $this->db->table('tool_issue_logs')
                    ->where('tool_id', $item['tool_id'])
                    ->where('issued_to', $transfer['from_technician_id'])
                    ->where('return_date IS NULL')
                    ->orderBy('id', 'DESC')
                    ->get()->getRowArray();

                if ($issueLog) {
                    // Create new issue log for receiving technician
                    $this->db->table('tool_issue_logs')->insert([
                        'plant_id' => $plantId,
                        'tool_request_item_id' => $issueLog['tool_request_item_id'],
                        'tool_id' => $item['tool_id'],
                        'issued_by' => $userId,
                        'issued_to' => $transfer['to_technician_id'],
                        'quantity' => $item['quantity'],
                        'condition_on_issue' => $item['condition_on_transfer'],
                        'issue_notes' => 'Transferred from technician',
                        'issue_date' => date('Y-m-d H:i:s'),
                        'created_at' => date('Y-m-d H:i:s')
                    ]);
                }
            }

            // Notify both technicians
            foreach ([$transfer['from_technician_id'], $transfer['to_technician_id']] as $techId) {
                $this->db->table('notifications')->insert([
                    'user_id' => $techId,
                    'type' => 'TOOL_TRANSFER',
                    'title' => 'Tool Transfer Approved',
                    'message' => "Transfer {$transfer['transfer_number']} has been approved",
                    'reference_type' => 'tool_transfer',
                    'reference_id' => $id,
                    'is_read' => 0,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
            }

            $this->db->transComplete();

            return $this->respond(['status' => 'success', 'message' => 'Transfer approved successfully']);
        } catch (\Exception $e) {
            return $this->fail('Failed to approve transfer: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reject transfer (Shop Attendant)
     * POST /api/v1/eam/tool-transfers/{id}/reject
     */
    public function reject($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);

            $data = $this->request->getJSON(true);
            $reason = $data['reason'] ?? 'No reason provided';

            $transfer = $this->db->table('tool_transfers')
                ->where('id', $id)->where('plant_id', $plantId)->get()->getRowArray();

            if (!$transfer || $transfer['transfer_status'] !== 'PENDING') {
                return $this->fail('Invalid transfer or already processed', 400);
            }

            $this->db->table('tool_transfers')->where('id', $id)->update([
                'transfer_status' => 'REJECTED',
                'approved_by' => $userId,
                'approved_at' => date('Y-m-d H:i:s'),
                'rejected_reason' => $reason,
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Notify requesting technician
            $this->db->table('notifications')->insert([
                'user_id' => $transfer['from_technician_id'],
                'type' => 'TOOL_TRANSFER',
                'title' => 'Tool Transfer Rejected',
                'message' => "Transfer {$transfer['transfer_number']} was rejected: {$reason}",
                'reference_type' => 'tool_transfer',
                'reference_id' => $id,
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return $this->respond(['status' => 'success', 'message' => 'Transfer rejected']);
        } catch (\Exception $e) {
            return $this->fail('Failed to reject transfer: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Confirm transfer completion (Receiving Technician)
     * POST /api/v1/eam/tool-transfers/{id}/complete
     */
    public function complete($id)
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);

            $transfer = $this->db->table('tool_transfers')
                ->where('id', $id)->where('plant_id', $plantId)->get()->getRowArray();

            if (!$transfer || $transfer['transfer_status'] !== 'APPROVED') {
                return $this->fail('Invalid transfer or not approved', 400);
            }

            if ($transfer['to_technician_id'] != $userId) {
                return $this->fail('Only receiving technician can complete transfer', 403);
            }

            $this->db->table('tool_transfers')->where('id', $id)->update([
                'transfer_status' => 'COMPLETED',
                'completed_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);

            // Notify transferring technician
            $this->db->table('notifications')->insert([
                'user_id' => $transfer['from_technician_id'],
                'type' => 'TOOL_TRANSFER',
                'title' => 'Tool Transfer Completed',
                'message' => "Transfer {$transfer['transfer_number']} has been completed",
                'reference_type' => 'tool_transfer',
                'reference_id' => $id,
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return $this->respond(['status' => 'success', 'message' => 'Transfer completed successfully']);
        } catch (\Exception $e) {
            return $this->fail('Failed to complete transfer: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get my issued tools (for transfer)
     * GET /api/v1/eam/tool-transfers/my-tools
     */
    public function myTools()
    {
        try {
            $plantIds = $this->getPlantIds();
            $plantId = is_array($plantIds) ? $plantIds[0] : $plantIds;
            
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? $jwtData->user_id ?? null) : ($jwtData['id'] ?? $jwtData['user_id'] ?? null);

            // Get all tools currently issued to this technician
            $tools = $this->db->table('tool_issue_logs til')
                ->select('til.tool_id, t.tool_name, t.tool_code, t.category, 
                         SUM(til.quantity) as quantity, til.condition_on_issue,
                         tr.request_number, tr.id as request_id')
                ->join('tools t', 't.id = til.tool_id', 'left')
                ->join('work_order_tool_request_items tri', 'tri.id = til.tool_request_item_id', 'left')
                ->join('work_order_tool_requests tr', 'tr.id = tri.tool_request_id', 'left')
                ->where('til.issued_to', $userId)
                ->where('til.return_date IS NULL')
                ->where('til.plant_id', $plantId)
                ->groupBy('til.tool_id')
                ->get()->getResultArray();

            return $this->respond(['status' => 'success', 'data' => $tools]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch tools: ' . $e->getMessage(), 500);
        }
    }
}
