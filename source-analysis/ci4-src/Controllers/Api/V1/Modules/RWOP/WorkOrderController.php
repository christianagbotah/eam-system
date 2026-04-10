<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;
use App\Traits\PlantScopeTrait;
use App\Services\RWOP\RwopVerificationService;
use App\Services\RWOP\RwopCostGovernanceService;
use App\Services\RWOP\RwopKpiSnapshotService;
use App\Services\RWOP\RwopRcaService;
use App\Services\RWOP\RwopReopenService;

class WorkOrdersController extends BaseApiController
{
    use PlantScopeTrait;

    protected $format = 'json';

    public function index()
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'view')) {
            return $this->failForbidden('Insufficient permissions to view work orders');
        }

        $db = \Config\Database::connect();
        $builder = $db->table('work_orders wo');

        // Apply plant scope filter
        $plantIds = $this->getPlantIds();
        if (!empty($plantIds)) {
            $builder->whereIn('wo.plant_id', $plantIds);
        }

        $builder->select('wo.*,
            u.full_name as assigned_to_name,
            d.department_name');
        $builder->join('users u', 'u.id = wo.assigned_to', 'left');
        $builder->join('departments d', 'd.id = wo.department_id', 'left');
        $builder->orderBy('wo.created_at', 'DESC');

        $workOrders = $builder->get()->getResultArray();

        // Audit log
        $this->auditLog('VIEW', 'work_orders', 0, null, ['count' => count($workOrders)]);

        return $this->respond([
            'status' => 'success',
            'data' => $workOrders
        ]);
    }

    public function show($id = null)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'view')) {
            return $this->failForbidden('Insufficient permissions to view work order details');
        }

        $db = \Config\Database::connect();

        // Get work order with asset info
        $workOrder = $db->table('work_orders wo')
            ->select('wo.*,
                m.machine_name,
                m.plant_location as asset_location,
                d.department_name,
                tl.full_name as team_leader_name,
                tl.trade as team_leader_skill')
            ->join('machines m', 'm.id = wo.asset_id', 'left')
            ->join('departments d', 'd.id = wo.department_id', 'left')
            ->join('users tl', 'tl.id = wo.team_leader_id', 'left');

        // Apply plant scope filter
        $plantIds = $this->getPlantIds();
        if (!empty($plantIds)) {
            $workOrder->whereIn('wo.plant_id', $plantIds);
        }

        $workOrder = $workOrder->where('wo.id', $id)
            ->get()
            ->getRowArray();

        if (!$workOrder) {
            return $this->failNotFound('Work order not found or access denied');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        // Log to verify safety_notes is present
        log_message('debug', 'Work Order Data: ' . json_encode($workOrder));

        // Get team members
        $teamMembers = $db->table('work_order_team_members wotm')
            ->select('wotm.*, u.full_name as name, u.trade, s.name as skill_name, wotm.is_leader')
            ->join('users u', 'u.id = wotm.technician_id', 'left')
            ->join('skills s', 's.id = u.trade', 'left')
            ->where('wotm.work_order_id', $id)
            ->get()
            ->getResultArray();

        // Get supervisors (from work_order_assignments or direct field)
        $supervisors = [];
        if ($workOrder['assigned_supervisor_id']) {
            $sup = $db->table('users')
                ->select('id as supervisor_id, full_name as name')
                ->where('id', $workOrder['assigned_supervisor_id'])
                ->get()
                ->getRowArray();
            if ($sup) $supervisors[] = $sup;
        }

        // Get required parts
        $requiredParts = $db->table('work_order_materials wom')
            ->select('wom.*, p.part_name, p.part_code as part_number, p.part_category as category')
            ->join('parts p', 'p.id = wom.part_id', 'left')
            ->where('wom.work_order_id', $id)
            ->get()
            ->getResultArray();

        // Get required tools from tool_assignments
        $requiredTools = $db->table('tool_assignments ta')
            ->select('ta.*, t.tool_name, t.tool_code, t.category')
            ->join('tools t', 't.id = ta.tool_id', 'left')
            ->where('ta.work_order_id', $id)
            ->get()
            ->getResultArray();

        // Debug log to check tool data
        log_message('debug', 'Required Tools Query Result: ' . json_encode($requiredTools));

        // Get materials used by technician
        $materialsRequested = $db->table('work_order_materials_used womu')
            ->select('womu.*')
            ->where('womu.work_order_id', $id)
            ->get()
            ->getResultArray();

        // Attach related data
        $workOrder['team_members'] = $teamMembers;
        $workOrder['supervisors'] = $supervisors;
        $workOrder['required_parts'] = $requiredParts;
        $workOrder['required_tools'] = $requiredTools;
        $workOrder['materials_requested'] = $materialsRequested;

        // Audit log
        $this->auditLog('VIEW_DETAIL', 'work_orders', $id);

        return $this->respond([
            'status' => 'success',
            'data' => $workOrder
        ]);
    }

    public function create()
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'create')) {
            return $this->failForbidden('Insufficient permissions to create work orders');
        }

        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);

        $data['wo_number'] = $this->generateWONumber();
        $data['status'] = $data['status'] ?? 'draft';

        // Auto-assign plant_id from current user context
        $plantId = $this->getPlantId();
        if ($plantId && !isset($data['plant_id'])) {
            $data['plant_id'] = $plantId;
        }

        // Validate plant ownership
        if (!$this->validateResourceOwnership('plants', $data['plant_id'] ?? $plantId)) {
            return $this->failForbidden('Cannot create work order for this plant');
        }

        if ($db->table('work_orders')->insert($data)) {
            $newId = $db->insertID();

            // Audit log
            $this->auditLog('CREATE', 'work_orders', $newId, null, $data);

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'Work order created',
                'data' => ['id' => $newId, 'wo_number' => $data['wo_number']]
            ]);
        }

        return $this->fail('Failed to create work order');
    }

    public function update($id = null)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'update')) {
            return $this->failForbidden('Insufficient permissions to update work orders');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $db = \Config\Database::connect();

        // Get old data for audit
        $oldData = $db->table('work_orders')->where('id', $id)->get()->getRowArray();

        $data = $this->request->getJSON(true);

        if ($db->table('work_orders')->where('id', $id)->update($data)) {
            // Audit log
            $this->auditLog('UPDATE', 'work_orders', $id, $oldData, $data);

            return $this->respond([
                'status' => 'success',
                'message' => 'Work order updated'
            ]);
        }

        return $this->fail('Failed to update work order');
    }

    public function delete($id = null)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'delete')) {
            return $this->failForbidden('Insufficient permissions to delete work orders');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $db = \Config\Database::connect();

        // Get old data for audit
        $oldData = $db->table('work_orders')->where('id', $id)->get()->getRowArray();

        if ($db->table('work_orders')->where('id', $id)->delete()) {
            // Audit log
            $this->auditLog('DELETE', 'work_orders', $id, $oldData, null);

            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'Work order deleted'
            ]);
        }

        return $this->fail('Failed to delete work order');
    }

    public function assignToSupervisor($id = null)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'update')) {
            return $this->failForbidden('Insufficient permissions to assign work orders');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        // Get old data for audit
        $oldData = $db->table('work_orders')->where('id', $id)->get()->getRowArray();

        $updateData = [
            'assigned_supervisor_id' => $data['supervisor_id'],
            'assignment_type' => 'via_supervisor',
            'status' => 'assigned_to_supervisor',
            'assigned_by' => $userId,
            'assigned_date' => date('Y-m-d H:i:s')
        ];

        if ($db->table('work_orders')->where('id', $id)->update($updateData)) {
            // Audit log
            $this->auditLog('ASSIGN_SUPERVISOR', 'work_orders', $id, $oldData, $updateData);

            return $this->respond([
                'status' => 'success',
                'message' => 'Work order assigned to supervisor'
            ]);
        }

        return $this->fail('Failed to assign work order to supervisor');
    }
    
    public function assignToTechnician($id = null)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'update')) {
            return $this->failForbidden('Insufficient permissions to assign work orders');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $workOrder = $db->table('work_orders')->where('id', $id)->get()->getRowArray();
        $assignmentType = $workOrder['assignment_type'] ?? 'direct';

        // Get old data for audit
        $oldData = $workOrder;

        $updateData = [
            'assigned_to' => $data['technician_id'],
            'assignment_type' => $assignmentType,
            'status' => 'assigned',
            'assigned_by' => $userId,
            'assigned_date' => date('Y-m-d H:i:s')
        ];

        if ($db->table('work_orders')->where('id', $id)->update($updateData)) {
            // Audit log
            $this->auditLog('ASSIGN_TECHNICIAN', 'work_orders', $id, $oldData, $updateData);

            return $this->respond([
                'status' => 'success',
                'message' => 'Work order assigned to technician'
            ]);
        }

        return $this->fail('Failed to assign work order to technician');
    }

    public function start($id = null)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'update')) {
            return $this->failForbidden('Insufficient permissions to start work orders');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $db = \Config\Database::connect();

        // Get old data for audit
        $oldData = $db->table('work_orders')->where('id', $id)->get()->getRowArray();

        $updateData = [
            'status' => 'in_progress',
            'actual_start' => date('Y-m-d H:i:s')
        ];

        if ($db->table('work_orders')->where('id', $id)->update($updateData)) {
            // Audit log
            $this->auditLog('START', 'work_orders', $id, $oldData, $updateData);

            return $this->respond([
                'status' => 'success',
                'message' => 'Work order started'
            ]);
        }

        return $this->fail('Failed to start work order');
    }

    public function complete($id = null)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'update')) {
            return $this->failForbidden('Insufficient permissions to complete work orders');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);

        // Get old data for audit
        $oldData = $db->table('work_orders')->where('id', $id)->get()->getRowArray();

        $updateData = [
            'status' => 'completed',
            'actual_end' => date('Y-m-d H:i:s'),
            'completion_notes' => $data['notes'] ?? ''
        ];

        if ($db->table('work_orders')->where('id', $id)->update($updateData)) {
            // Audit log
            $this->auditLog('COMPLETE', 'work_orders', $id, $oldData, $updateData);

            return $this->respond([
                'status' => 'success',
                'message' => 'Work order completed'
            ]);
        }

        return $this->fail('Failed to complete work order');
    }

    public function dashboard()
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'view')) {
            return $this->failForbidden('Insufficient permissions to view work order dashboard');
        }

        $db = \Config\Database::connect();

        // Apply plant scope to dashboard stats
        $plantIds = $this->getPlantIds();
        $whereClause = '';
        if (!empty($plantIds)) {
            $whereClause = 'WHERE plant_id IN (' . implode(',', $plantIds) . ')';
        }

        $stats = [
            'total' => $db->query("SELECT COUNT(*) as count FROM work_orders $whereClause")->getRow()->count,
            'pending' => $db->query("SELECT COUNT(*) as count FROM work_orders $whereClause AND status = 'pending'")->getRow()->count,
            'in_progress' => $db->query("SELECT COUNT(*) as count FROM work_orders $whereClause AND status = 'in_progress'")->getRow()->count,
            'completed' => $db->query("SELECT COUNT(*) as count FROM work_orders $whereClause AND status = 'completed'")->getRow()->count,
        ];

        // Audit log
        $this->auditLog('VIEW_DASHBOARD', 'work_orders', 0, null, $stats);

        return $this->respond([
            'status' => 'success',
            'data' => $stats
        ]);
    }

    private function generateWONumber()
    {
        $db = \Config\Database::connect();
        $year = date('Y');
        $month = date('m');
        
        $count = $db->table('work_orders')
            ->where('YEAR(created_at)', $year)
            ->where('MONTH(created_at)', $month)
            ->countAllResults();
        
        return sprintf('WO-%s%s-%04d', $year, $month, $count + 1);
    }
    
    public function verify($id)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'update')) {
            return $this->failForbidden('Insufficient permissions to verify work orders');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $verificationService = new RwopVerificationService();
        $data = $this->request->getJSON(true);
        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        // Get old data for audit
        $oldData = \Config\Database::connect()->table('work_orders')->where('id', $id)->get()->getRowArray();

        $result = $verificationService->verifyCompletion($id, $userId, $data);

        if ($result['success']) {
            // Audit log
            $this->auditLog('VERIFY', 'work_orders', $id, $oldData, ['verification_data' => $data]);

            return $this->respond(['status' => 'success', 'message' => 'Work order verified']);
        }

        return $this->fail($result['error']);
    }
    
    public function reopen($id)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'update')) {
            return $this->failForbidden('Insufficient permissions to reopen work orders');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $reopenService = new RwopReopenService();
        $data = $this->request->getJSON(true);
        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $approvalRequired = $reopenService->checkReopenApprovalRequired($id);
        $reopenService->logReopen($id, $userId, $data['reason'], $approvalRequired);

        $db = \Config\Database::connect();

        // Get old data for audit
        $oldData = $db->table('work_orders')->where('id', $id)->get()->getRowArray();

        $updateData = [
            'status' => 'in_progress',
            'reopen_count' => $db->table('work_orders')->select('reopen_count')->where('id', $id)->get()->getRow()->reopen_count + 1
        ];

        $db->table('work_orders')->where('id', $id)->update($updateData);

        // Audit log
        $this->auditLog('REOPEN', 'work_orders', $id, $oldData, $updateData);

        return $this->respond(['status' => 'success', 'message' => 'Work order reopened']);
    }
    
    public function close($id)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'update')) {
            return $this->failForbidden('Insufficient permissions to close work orders');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $costService = new RwopCostGovernanceService();
        $kpiService = new RwopKpiSnapshotService();
        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $db = \Config\Database::connect();

        // Get old data for audit
        $oldData = $db->table('work_orders')->where('id', $id)->get()->getRowArray();

        $db->table('work_orders')->where('id', $id)->update(['status' => 'closed']);

        $costService->lockCosts($id, $userId);
        $kpiService->createSnapshot($id, $userId);

        // Audit log
        $this->auditLog('CLOSE', 'work_orders', $id, $oldData, ['status' => 'closed']);

        return $this->respond(['status' => 'success', 'message' => 'Work order closed']);
    }
    
    public function adjustCost($id)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'update')) {
            return $this->failForbidden('Insufficient permissions to adjust work order costs');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $costService = new RwopCostGovernanceService();
        $data = $this->request->getJSON(true);
        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $result = $costService->adjustCost(
            $id,
            $data['type'],
            $data['new_amount'],
            $data['reason'],
            $data['approved_by'],
            $userId
        );

        if ($result['success']) {
            // Audit log
            $this->auditLog('ADJUST_COST', 'work_orders', $id, null, [
                'type' => $data['type'],
                'new_amount' => $data['new_amount'],
                'reason' => $data['reason']
            ]);

            return $this->respond(['status' => 'success', 'data' => $result]);
        }

        return $this->fail($result['error']);
    }
    
    public function addFailureAnalysis($id)
    {
        // Permission check
        if (!$this->checkPermission('workorder', 'update')) {
            return $this->failForbidden('Insufficient permissions to add failure analysis');
        }

        // Validate resource ownership
        if (!$this->validateResourceOwnership('work_orders', $id)) {
            return $this->failForbidden('Access denied to this work order');
        }

        $rcaService = new RwopRcaService();
        $data = $this->request->getJSON(true);
        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? 1;

        $rcaId = $rcaService->createRca($id, $userId, $data);
        $rcaService->markRcaComplete($id, $userId);

        // Audit log
        $this->auditLog('ADD_FAILURE_ANALYSIS', 'work_orders', $id, null, [
            'rca_id' => $rcaId,
            'analysis_data' => $data
        ]);

        return $this->respond(['status' => 'success', 'data' => ['rca_id' => $rcaId]]);
    }
}
