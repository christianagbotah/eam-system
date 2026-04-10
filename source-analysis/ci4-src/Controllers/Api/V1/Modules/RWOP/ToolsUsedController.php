<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;

class ToolsUsedController extends BaseApiController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    /**
     * Get tools used for a work order
     * GET /api/v1/eam/work-orders/{id}/tools-used
     */
    public function getByWorkOrder($workOrderId)
    {
        try {
            $tools = $this->db->table('work_order_tools_used tu')
                ->select('tu.*, u.username as recorded_by_name')
                ->join('users u', 'u.id = tu.recorded_by', 'left')
                ->where('tu.work_order_id', $workOrderId)
                ->orderBy('tu.created_at', 'DESC')
                ->get()->getResultArray();

            return $this->respond(['status' => 'success', 'data' => $tools]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch tools used: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get suggested tools from issued requests
     * GET /api/v1/eam/work-orders/{id}/tools-used/suggestions
     */
    public function getSuggestions($workOrderId)
    {
        try {
            // Get issued tools from requests
            $suggestions = $this->db->table('work_order_tool_requests tr')
                ->select('ti.id as item_id, ti.tool_id, ti.tool_name, ti.tool_code, ti.issued_quantity, 
                         tr.id as request_id, tr.request_number')
                ->join('work_order_tool_request_items ti', 'ti.tool_request_id = tr.id')
                ->where('tr.work_order_id', $workOrderId)
                ->whereIn('tr.request_status', ['ISSUED', 'PARTIAL_ISSUED'])
                ->where('ti.issued_quantity >', 0)
                ->get()->getResultArray();

            // Check which are already recorded
            foreach ($suggestions as &$tool) {
                $recorded = $this->db->table('work_order_tools_used')
                    ->where('work_order_id', $workOrderId)
                    ->where('tool_request_id', $tool['request_id'])
                    ->where('tool_id', $tool['tool_id'])
                    ->countAllResults();
                
                $tool['already_recorded'] = $recorded > 0;
            }

            return $this->respond(['status' => 'success', 'data' => $suggestions]);
        } catch (\Exception $e) {
            return $this->fail('Failed to fetch suggestions: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Record tool usage
     * POST /api/v1/eam/work-orders/{id}/tools-used
     */
    public function record($workOrderId)
    {
        try {
            $jwtData = $GLOBALS['jwt_user_data'] ?? null;
            $userId = is_object($jwtData) ? ($jwtData->id ?? null) : ($jwtData['id'] ?? null);

            $data = $this->request->getJSON(true);

            if (!isset($data['tools']) || !is_array($data['tools']) || empty($data['tools'])) {
                return $this->fail('Tools array is required', 400);
            }

            $this->db->transStart();

            foreach ($data['tools'] as $tool) {
                $toolData = [
                    'work_order_id' => $workOrderId,
                    'tool_id' => $tool['tool_id'] ?? null,
                    'tool_name' => $tool['tool_name'],
                    'tool_code' => $tool['tool_code'] ?? null,
                    'source_type' => $tool['source_type'] ?? 'PERSONAL',
                    'tool_request_id' => $tool['tool_request_id'] ?? null,
                    'quantity_used' => $tool['quantity_used'] ?? 1,
                    'usage_duration_minutes' => $tool['usage_duration_minutes'] ?? null,
                    'recorded_by' => $userId,
                    'notes' => $tool['notes'] ?? null,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ];

                $this->db->table('work_order_tools_used')->insert($toolData);
            }

            $this->db->transComplete();

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Tools usage recorded successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail('Failed to record tools: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete tool usage record
     * DELETE /api/v1/eam/tools-used/{id}
     */
    public function delete($id)
    {
        try {
            $this->db->table('work_order_tools_used')->where('id', $id)->delete();
            return $this->respond(['status' => 'success', 'message' => 'Tool usage record deleted']);
        } catch (\Exception $e) {
            return $this->fail('Failed to delete: ' . $e->getMessage(), 500);
        }
    }
}
