<?php

namespace App\Controllers\Api\V1\Modules\RWOP;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\WorkOrderTeamMemberModel;
use App\Models\WorkOrderAssistanceRequestModel;
use App\Models\WorkOrderJobPlanModel;
use App\Models\WorkOrderResourceReservationModel;
use App\Models\WorkOrderStatusHistoryModel;
use App\Models\WorkOrderSlaTrackingModel;
use App\Models\SLADefinitionModel;
use App\Models\PredictiveMaintenanceInspectionModel;
use App\Models\ShutdownEventModel;
use App\Models\ShutdownWorkOrderModel;

class MaintenanceOrderController extends BaseApiController
{
    protected $format = 'json';

    public function index()
    {
        if (!$this->checkPermission('rwop', 'read')) {
            return $this->failForbidden('Access denied: insufficient permissions');
        }

        $db = \Config\Database::connect();
        $plantIds = $this->getPlantIds();
        $status = $this->request->getGet('status');
        $type = $this->request->getGet('type');
        $priority = $this->request->getGet('priority');
        
        $builder = $db->table('maintenance_orders mo')
            ->select('mo.*, u1.username as requested_by_name, u2.username as assigned_to_name')
            ->join('users u1', 'u1.id = mo.requested_by', 'left')
            ->join('users u2', 'u2.id = mo.assigned_to', 'left')
            ->whereIn('mo.plant_id', $plantIds)
            ->orderBy('mo.created_at', 'DESC');
        
        if ($status) $builder->where('mo.status', $status);
        if ($type) $builder->where('mo.order_type', $type);
        if ($priority) $builder->where('mo.priority', $priority);
        
        $orders = $builder->get()->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $orders]);
    }

    public function show($id = null)
    {
        if (!$this->checkPermission('rwop', 'read')) {
            return $this->failForbidden('Access denied: insufficient permissions');
        }

        $db = \Config\Database::connect();
        $plantIds = $this->getPlantIds();

        $order = $db->table('maintenance_orders')->where('id', $id)->whereIn('plant_id', $plantIds)->get()->getRowArray();
        
        if (!$order) {
            return $this->failNotFound('Order not found');
        }
        
        $order['labor'] = $db->table('maintenance_order_labor')->where('maintenance_order_id', $id)->get()->getResultArray();
        $order['parts'] = $db->table('maintenance_order_parts')->where('maintenance_order_id', $id)->get()->getResultArray();
        $order['checklist'] = $db->table('maintenance_order_checklist')->where('maintenance_order_id', $id)->orderBy('item_order')->get()->getResultArray();
        $order['logs'] = $db->table('maintenance_order_logs')->where('maintenance_order_id', $id)->orderBy('created_at', 'DESC')->get()->getResultArray();
        $order['external_services'] = $db->table('maintenance_order_external_services')->where('maintenance_order_id', $id)->get()->getResultArray();
        $order['downtime'] = $db->table('maintenance_order_downtime')->where('maintenance_order_id', $id)->get()->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $order]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $orderNumber = $this->generateOrderNumber($data['order_type']);
        $data['order_number'] = $orderNumber;
        $data['created_by'] = $data['created_by'] ?? 1;
        $data['requested_date'] = date('Y-m-d H:i:s');
        
        $db->table('maintenance_orders')->insert($data);
        $orderId = $db->insertID();
        
        $this->addLog($orderId, 'status_change', null, $data['status'], 'Order created');
        
        return $this->respondCreated(['status' => 'success', 'message' => 'Order created', 'data' => ['id' => $orderId, 'order_number' => $orderNumber]]);
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        $old = $db->table('maintenance_orders')->where('id', $id)->get()->getRowArray();
        
        if ($db->table('maintenance_orders')->where('id', $id)->update($data)) {
            if (isset($data['status']) && $old['status'] !== $data['status']) {
                $this->addLog($id, 'status_change', $old['status'], $data['status'], 'Status updated');
            }
            return $this->respond(['status' => 'success', 'message' => 'Order updated']);
        }
        
        return $this->fail('Update failed', 400);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        if ($db->table('maintenance_orders')->where('id', $id)->delete()) {
            return $this->respond(['status' => 'success', 'message' => 'Order deleted']);
        }
        return $this->fail('Delete failed', 400);
    }

    public function addLabor($id)
    {
        $data = $this->request->getJSON(true);
        $data['maintenance_order_id'] = $id;
        
        if ($data['end_time']) {
            $start = strtotime($data['start_time']);
            $end = strtotime($data['end_time']);
            $data['hours_worked'] = round(($end - $start) / 3600, 2);
            $data['labor_cost'] = $data['hours_worked'] * ($data['hourly_rate'] ?? 0);
        }
        
        $db = \Config\Database::connect();
        $db->table('maintenance_order_labor')->insert($data);
        
        $this->updateOrderCosts($id);
        
        return $this->respondCreated(['status' => 'success', 'message' => 'Labor added']);
    }

    public function addPart($id)
    {
        $data = $this->request->getJSON(true);
        $data['maintenance_order_id'] = $id;
        $data['total_cost'] = $data['quantity_required'] * ($data['unit_cost'] ?? 0);
        
        $db = \Config\Database::connect();
        $db->table('maintenance_order_parts')->insert($data);
        
        $this->updateOrderCosts($id);
        
        return $this->respondCreated(['status' => 'success', 'message' => 'Part added']);
    }

    public function addChecklistItem($id)
    {
        $data = $this->request->getJSON(true);
        $data['maintenance_order_id'] = $id;
        
        $db = \Config\Database::connect();
        $db->table('maintenance_order_checklist')->insert($data);
        
        return $this->respondCreated(['status' => 'success', 'message' => 'Checklist item added']);
    }

    public function updateChecklistItem($id, $itemId)
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        if ($data['is_completed']) {
            $data['completed_at'] = date('Y-m-d H:i:s');
        }
        
        $db->table('maintenance_order_checklist')->where('id', $itemId)->update($data);
        
        return $this->respond(['status' => 'success', 'message' => 'Checklist updated']);
    }

    public function addLog($orderId, $type = 'comment', $oldValue = null, $newValue = null, $comment = null)
    {
        $db = \Config\Database::connect();
        $db->table('maintenance_order_logs')->insert([
            'maintenance_order_id' => $orderId,
            'log_type' => $type,
            'user_id' => 1,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'comment' => $comment
        ]);
    }

    private function updateOrderCosts($orderId)
    {
        $db = \Config\Database::connect();
        
        $laborCost = $db->table('maintenance_order_labor')
            ->selectSum('labor_cost')
            ->where('maintenance_order_id', $orderId)
            ->get()->getRow()->labor_cost ?? 0;
        
        $partsCost = $db->table('maintenance_order_parts')
            ->selectSum('total_cost')
            ->where('maintenance_order_id', $orderId)
            ->get()->getRow()->total_cost ?? 0;
        
        $externalCost = $db->table('maintenance_order_external_services')
            ->selectSum('actual_cost')
            ->where('maintenance_order_id', $orderId)
            ->get()->getRow()->actual_cost ?? 0;
        
        $db->table('maintenance_orders')->where('id', $orderId)->update([
            'labor_cost' => $laborCost,
            'parts_cost' => $partsCost,
            'external_cost' => $externalCost,
            'actual_cost' => $laborCost + $partsCost + $externalCost
        ]);
    }

    private function generateOrderNumber($type)
    {
        $prefix = [
            'preventive' => 'PM',
            'corrective' => 'CM',
            'breakdown' => 'BM',
            'inspection' => 'IN',
            'modification' => 'MD',
            'calibration' => 'CL'
        ];
        
        return ($prefix[$type] ?? 'MO') . '-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
    }

    public function dashboard()
    {
        $db = \Config\Database::connect();
        
        $stats = [
            'total' => $db->table('maintenance_orders')->countAllResults(),
            'pending' => $db->table('maintenance_orders')->where('status', 'pending')->countAllResults(),
            'in_progress' => $db->table('maintenance_orders')->where('status', 'in_progress')->countAllResults(),
            'completed_today' => $db->table('maintenance_orders')->where('status', 'completed')->where('DATE(actual_end)', date('Y-m-d'))->countAllResults(),
            'overdue' => $db->table('maintenance_orders')->whereNotIn('status', ['completed', 'cancelled', 'closed'])->where('scheduled_end <', date('Y-m-d H:i:s'))->countAllResults(),
            'by_type' => $db->query("SELECT order_type, COUNT(*) as count FROM maintenance_orders GROUP BY order_type")->getResultArray(),
            'by_priority' => $db->query("SELECT priority, COUNT(*) as count FROM maintenance_orders WHERE status NOT IN ('completed', 'cancelled', 'closed') GROUP BY priority")->getResultArray(),
            'avg_completion_time' => $db->query("SELECT AVG(TIMESTAMPDIFF(HOUR, actual_start, actual_end)) as avg_hours FROM maintenance_orders WHERE status = 'completed' AND actual_start IS NOT NULL AND actual_end IS NOT NULL")->getRow()->avg_hours ?? 0,
            'total_cost_month' => $db->query("SELECT SUM(actual_cost) as total FROM maintenance_orders WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())")->getRow()->total ?? 0
        ];
        
        return $this->respond(['status' => 'success', 'data' => $stats]);
    }

    public function getFailureCodes()
    {
        $db = \Config\Database::connect();
        $codes = $db->table('failure_codes')->where('is_active', 1)->get()->getResultArray();
        return $this->respond(['status' => 'success', 'data' => $codes]);
    }

    public function getExternalServices()
    {
        $db = \Config\Database::connect();
        $services = $db->table('maintenance_order_external_services')->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->respond(['status' => 'success', 'data' => $services]);
    }

    public function addExternalService()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        $db->table('maintenance_order_external_services')->insert($data);
        return $this->respondCreated(['status' => 'success', 'message' => 'External service added']);
    }

    // ==================== ENTERPRISE FEATURES v3.0 ====================
    
    // TEAM MANAGEMENT
    public function getTeam($id)
    {
        $model = new WorkOrderTeamMemberModel();
        $members = $model->where('work_order_id', $id)->findAll();
        return $this->respond(['status' => 'success', 'data' => $members]);
    }

    public function assignTeam($id)
    {
        $model = new WorkOrderTeamMemberModel();
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $id;
        $data['assigned_date'] = date('Y-m-d H:i:s');
        
        if ($model->insert($data)) {
            $this->logStatusHistory($id, null, 'team_assigned', $data['assigned_by']);
            return $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()]);
        }
        return $this->fail($model->errors());
    }

    public function updateTeamMember($id, $memberId)
    {
        $model = new WorkOrderTeamMemberModel();
        $data = $this->request->getJSON(true);
        return $model->update($memberId, $data) 
            ? $this->respond(['status' => 'success']) 
            : $this->fail($model->errors());
    }

    public function removeTeamMember($id, $memberId)
    {
        $model = new WorkOrderTeamMemberModel();
        return $model->delete($memberId) 
            ? $this->respond(['status' => 'success']) 
            : $this->fail('Failed to remove team member');
    }

    // ASSISTANCE REQUESTS
    public function getAssistanceRequests($id = null)
    {
        $model = new WorkOrderAssistanceRequestModel();
        $query = $id ? $model->where('work_order_id', $id) : $model;
        $status = $this->request->getGet('status');
        if ($status) $query = $query->where('status', $status);
        return $this->respond(['status' => 'success', 'data' => $query->findAll()]);
    }

    public function createAssistanceRequest($id)
    {
        $model = new WorkOrderAssistanceRequestModel();
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $id;
        $data['requested_at'] = date('Y-m-d H:i:s');
        
        return $model->insert($data) 
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()]) 
            : $this->fail($model->errors());
    }

    public function approveAssistanceRequest($id, $requestId)
    {
        $model = new WorkOrderAssistanceRequestModel();
        $data = $this->request->getJSON(true);
        
        $updateData = [
            'status' => 'approved',
            'approved_by' => $data['approved_by'],
            'approved_at' => date('Y-m-d H:i:s'),
            'assigned_technician_id' => $data['assigned_technician_id'] ?? null
        ];
        
        if ($model->update($requestId, $updateData)) {
            if (isset($data['assigned_technician_id'])) {
                $teamModel = new WorkOrderTeamMemberModel();
                $teamModel->insert([
                    'work_order_id' => $id,
                    'technician_id' => $data['assigned_technician_id'],
                    'role' => 'assistant',
                    'assigned_date' => date('Y-m-d H:i:s'),
                    'assigned_by' => $data['approved_by'],
                    'status' => 'assigned'
                ]);
            }
            return $this->respond(['status' => 'success']);
        }
        return $this->fail($model->errors());
    }

    public function rejectAssistanceRequest($id, $requestId)
    {
        $model = new WorkOrderAssistanceRequestModel();
        $data = $this->request->getJSON(true);
        
        return $model->update($requestId, [
            'status' => 'rejected',
            'approved_by' => $data['approved_by'],
            'approved_at' => date('Y-m-d H:i:s'),
            'rejection_reason' => $data['rejection_reason']
        ]) ? $this->respond(['status' => 'success']) : $this->fail($model->errors());
    }

    // JOB PLANNING
    public function getJobPlan($id)
    {
        $model = new WorkOrderJobPlanModel();
        $plan = $model->where('work_order_id', $id)->first();
        return $this->respond(['status' => 'success', 'data' => $plan]);
    }

    public function createJobPlan($id)
    {
        $model = new WorkOrderJobPlanModel();
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $id;
        
        foreach (['required_skills', 'required_tools', 'required_parts', 'permits_required'] as $field) {
            if (isset($data[$field]) && is_array($data[$field])) {
                $data[$field] = json_encode($data[$field]);
            }
        }
        
        return $model->insert($data) 
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()]) 
            : $this->fail($model->errors());
    }

    public function updateJobPlan($id, $planId)
    {
        $model = new WorkOrderJobPlanModel();
        $data = $this->request->getJSON(true);
        
        foreach (['required_skills', 'required_tools', 'required_parts', 'permits_required'] as $field) {
            if (isset($data[$field]) && is_array($data[$field])) {
                $data[$field] = json_encode($data[$field]);
            }
        }
        
        return $model->update($planId, $data) 
            ? $this->respond(['status' => 'success']) 
            : $this->fail($model->errors());
    }

    // RESOURCE RESERVATIONS
    public function getReservations($id)
    {
        $model = new WorkOrderResourceReservationModel();
        return $this->respond(['status' => 'success', 'data' => $model->where('work_order_id', $id)->findAll()]);
    }

    public function createReservation($id)
    {
        $model = new WorkOrderResourceReservationModel();
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $id;
        $data['reserved_at'] = date('Y-m-d H:i:s');
        
        return $model->insert($data) 
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()]) 
            : $this->fail($model->errors());
    }

    public function updateReservation($id, $reservationId)
    {
        $model = new WorkOrderResourceReservationModel();
        $data = $this->request->getJSON(true);
        return $model->update($reservationId, $data) 
            ? $this->respond(['status' => 'success']) 
            : $this->fail($model->errors());
    }

    // SLA TRACKING
    public function getSlaTracking($id)
    {
        $model = new WorkOrderSlaTrackingModel();
        return $this->respond(['status' => 'success', 'data' => $model->where('work_order_id', $id)->first()]);
    }

    public function getBreachedSlas()
    {
        $model = new WorkOrderSlaTrackingModel();
        $breached = $model->groupStart()->where('response_breached', 1)->orWhere('resolution_breached', 1)->groupEnd()->findAll();
        return $this->respond(['status' => 'success', 'data' => $breached]);
    }

    public function initializeSla($id)
    {
        $data = $this->request->getJSON(true);
        $slaModel = new SLADefinitionModel();
        $sla = $slaModel->where('priority', $data['priority'])->where('order_type', $data['order_type'])->where('active', 1)->first();
        
        if (!$sla) return $this->fail('No SLA definition found');
        
        $trackingModel = new WorkOrderSlaTrackingModel();
        $trackingData = [
            'work_order_id' => $id,
            'sla_definition_id' => $sla['id'],
            'target_response_time' => date('Y-m-d H:i:s', strtotime("+{$sla['response_time_hours']} hours")),
            'target_resolution_time' => date('Y-m-d H:i:s', strtotime("+{$sla['resolution_time_hours']} hours"))
        ];
        
        return $trackingModel->insert($trackingData) 
            ? $this->respondCreated(['status' => 'success', 'id' => $trackingModel->getInsertID()]) 
            : $this->fail($trackingModel->errors());
    }

    // PREDICTIVE MAINTENANCE
    public function getInspections($assetId = null)
    {
        $model = new PredictiveMaintenanceInspectionModel();
        $query = $assetId ? $model->where('asset_id', $assetId) : $model;
        $status = $this->request->getGet('status');
        if ($status) $query = $query->where('status', $status);
        return $this->respond(['status' => 'success', 'data' => $query->orderBy('inspection_date', 'DESC')->findAll()]);
    }

    public function createInspection()
    {
        $model = new PredictiveMaintenanceInspectionModel();
        $data = $this->request->getJSON(true);
        
        if (isset($data['reading_value'], $data['threshold_critical'], $data['threshold_warning'])) {
            $data['status'] = $data['reading_value'] >= $data['threshold_critical'] ? 'critical' 
                : ($data['reading_value'] >= $data['threshold_warning'] ? 'warning' : 'normal');
        }
        
        return $model->insert($data) 
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()]) 
            : $this->fail($model->errors());
    }

    // SHUTDOWN EVENTS
    public function getShutdownEvents()
    {
        $model = new ShutdownEventModel();
        $status = $this->request->getGet('status');
        $query = $status ? $model->where('status', $status) : $model;
        return $this->respond(['status' => 'success', 'data' => $query->orderBy('planned_start_date', 'DESC')->findAll()]);
    }

    public function createShutdownEvent()
    {
        $model = new ShutdownEventModel();
        $data = $this->request->getJSON(true);
        return $model->insert($data) 
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()]) 
            : $this->fail($model->errors());
    }

    public function linkToShutdown($id)
    {
        $model = new ShutdownWorkOrderModel();
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $id;
        if (isset($data['dependencies']) && is_array($data['dependencies'])) {
            $data['dependencies'] = json_encode($data['dependencies']);
        }
        return $model->insert($data) 
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()]) 
            : $this->fail($model->errors());
    }

    // HELPER
    private function logStatusHistory($workOrderId, $fromStatus, $toStatus, $changedBy, $reason = null)
    {
        $model = new WorkOrderStatusHistoryModel();
        $model->insert([
            'work_order_id' => $workOrderId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'changed_by' => $changedBy,
            'changed_at' => date('Y-m-d H:i:s'),
            'reason' => $reason
        ]);
    }
}
