<?php

namespace App\Services;

class MaintenanceWorkflowService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    /**
     * Record workflow action in history
     */
    public function recordWorkflowAction($requestId, $fromStatus, $toStatus, $actionBy, $actionType, $notes = null)
    {
        $this->db->table('maintenance_request_workflow')->insert([
            'request_id' => $requestId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'action_by' => $actionBy,
            'action_type' => $actionType,
            'notes' => $notes,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Send notification to user
     */
    public function sendNotification($userId, $requestId, $type, $title, $message, $workOrderId = null)
    {
        $this->db->table('maintenance_notifications')->insert([
            'user_id' => $userId,
            'request_id' => $requestId,
            'work_order_id' => $workOrderId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'is_read' => false,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
    
    /**
     * Get workflow history for a request
     */
    public function getWorkflowHistory($requestId)
    {
        return $this->db->table('maintenance_request_workflow w')
            ->select('w.*, u.username as action_by_name, u.email as action_by_email')
            ->join('users u', 'u.id = w.action_by', 'left')
            ->where('w.request_id', $requestId)
            ->orderBy('w.created_at', 'DESC')
            ->get()
            ->getResultArray();
    }
    
    /**
     * Get supervisor for department
     */
    public function getDepartmentSupervisor($departmentId)
    {
        return $this->db->table('users')
            ->where('department_id', $departmentId)
            ->where('role', 'supervisor')
            ->where('is_active', 1)
            ->get()
            ->getRowArray();
    }
    
    /**
     * Get planners by type
     */
    public function getPlannersByType($plannerType = null)
    {
        $builder = $this->db->table('users')
            ->where('role', 'planner')
            ->where('is_active', 1);
            
        if ($plannerType) {
            $builder->where('planner_type', $plannerType);
        }
        
        return $builder->get()->getResultArray();
    }
}
