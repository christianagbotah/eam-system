<?php

namespace App\Controllers\Api\V1\Modules\TRAC;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\ToolModel;

class ToolsController extends BaseApiController
{
    protected $format = 'json';
    
    public function index()
    {
        try {
            $model = new ToolModel();
            $db = \Config\Database::connect();
            
            $builder = $db->table('tools t')
                ->select('t.*')
                ->where('t.is_active', 1)
                ->orderBy('t.tool_name', 'ASC');
            
            $tools = $builder->get()->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $tools
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
    
    public function show($id = null)
    {
        try {
            $model = new ToolModel();
            $tool = $model->find($id);
            
            if (!$tool) {
                return $this->failNotFound('Tool not found');
            }
            
            // Get assignment history
            $db = \Config\Database::connect();
            $assignments = $db->table('tool_assignments ta')
                ->select('ta.*, wo.work_order_number, u.username as assigned_to_name')
                ->join('work_orders wo', 'wo.id = ta.work_order_id', 'left')
                ->join('users u', 'u.id = ta.assigned_to_user_id', 'left')
                ->where('ta.tool_id', $id)
                ->orderBy('ta.assigned_at', 'DESC')
                ->limit(10)
                ->get()->getResultArray();
            
            $tool['assignments'] = $assignments;
            
            return $this->respond([
                'status' => 'success',
                'data' => $tool
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
    
    public function create()
    {
        try {
            $model = new ToolModel();
            $data = $this->request->getJSON(true);
            
            // Auto-generate tool code if not provided
            if (empty($data['tool_code'])) {
                $data['tool_code'] = $this->generateToolCode();
            }
            
            $userData = \App\Filters\JWTAuthFilter::getUserData();
            $data['created_by'] = $userData->user_id ?? 1;
            
            if ($model->insert($data)) {
                $id = $model->getInsertID();
                $tool = $model->find($id);
                
                return $this->respondCreated([
                    'status' => 'success',
                    'message' => 'Tool created successfully',
                    'data' => $tool
                ]);
            }
            
            return $this->fail($model->errors());
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
    
    public function update($id = null)
    {
        try {
            $model = new ToolModel();
            $tool = $model->find($id);
            
            if (!$tool) {
                return $this->failNotFound('Tool not found');
            }
            
            $data = $this->request->getJSON(true);
            
            if ($model->update($id, $data)) {
                $tool = $model->find($id);
                
                return $this->respond([
                    'status' => 'success',
                    'message' => 'Tool updated successfully',
                    'data' => $tool
                ]);
            }
            
            return $this->fail($model->errors());
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
    
    public function delete($id = null)
    {
        try {
            $model = new ToolModel();
            $tool = $model->find($id);
            
            if (!$tool) {
                return $this->failNotFound('Tool not found');
            }
            
            // Soft delete by setting is_active to false
            if ($model->update($id, ['is_active' => false])) {
                return $this->respondDeleted([
                    'status' => 'success',
                    'message' => 'Tool deleted successfully'
                ]);
            }
            
            return $this->fail('Failed to delete tool');
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
    
    public function assign()
    {
        try {
            $data = $this->request->getJSON(true);
            $db = \Config\Database::connect();
            
            $toolId = $data['tool_id'];
            $quantity = $data['quantity'] ?? 1;
            
            // Check availability
            $tool = $db->table('tools')->where('id', $toolId)->get()->getRowArray();
            
            if (!$tool || $tool['quantity_available'] < $quantity) {
                return $this->fail('Insufficient tool quantity available');
            }
            
            // Create assignment
            $db->table('tool_assignments')->insert([
                'tool_id' => $toolId,
                'work_order_id' => $data['work_order_id'],
                'assigned_to_user_id' => $data['assigned_to_user_id'] ?? null,
                'quantity' => $quantity,
                'assigned_at' => date('Y-m-d H:i:s'),
                'status' => 'assigned',
                'created_at' => date('Y-m-d H:i:s')
            ]);
            
            // Update tool quantities
            $db->table('tools')
                ->where('id', $toolId)
                ->set('quantity_available', 'quantity_available - ' . $quantity, false)
                ->set('quantity_in_use', 'quantity_in_use + ' . $quantity, false)
                ->update();
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Tool assigned successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
    
    public function returnTool()
    {
        try {
            $data = $this->request->getJSON(true);
            $db = \Config\Database::connect();
            
            $assignmentId = $data['assignment_id'];
            $assignment = $db->table('tool_assignments')->where('id', $assignmentId)->get()->getRowArray();
            
            if (!$assignment) {
                return $this->failNotFound('Assignment not found');
            }
            
            // Update assignment
            $db->table('tool_assignments')
                ->where('id', $assignmentId)
                ->update([
                    'returned_at' => date('Y-m-d H:i:s'),
                    'status' => 'returned',
                    'condition_on_return' => $data['condition'] ?? 'good',
                    'notes' => $data['notes'] ?? null
                ]);
            
            // Update tool quantities
            $db->table('tools')
                ->where('id', $assignment['tool_id'])
                ->set('quantity_available', 'quantity_available + ' . $assignment['quantity'], false)
                ->set('quantity_in_use', 'quantity_in_use - ' . $assignment['quantity'], false)
                ->update();
            
            // Update condition if damaged
            if (isset($data['condition']) && in_array($data['condition'], ['poor', 'damaged'])) {
                $db->table('tools')
                    ->where('id', $assignment['tool_id'])
                    ->update(['condition_status' => $data['condition']]);
            }
            
            return $this->respond([
                'status' => 'success',
                'message' => 'Tool returned successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
    
    private function generateToolCode()
    {
        $db = \Config\Database::connect();
        $lastTool = $db->table('tools')
            ->select('tool_code')
            ->orderBy('id', 'DESC')
            ->limit(1)
            ->get()->getRowArray();
        
        if ($lastTool && preg_match('/TOOL-(\d+)/', $lastTool['tool_code'], $matches)) {
            $nextNumber = intval($matches[1]) + 1;
        } else {
            $nextNumber = 1;
        }
        
        return 'TOOL-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
    }
}
