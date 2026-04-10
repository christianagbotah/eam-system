<?php

namespace App\Services;

/**
 * Enterprise-Grade Maintenance Workflow State Machine
 * Ensures proper workflow transitions and prevents invalid state changes
 */
class MaintenanceWorkflowStateMachine
{
    // Workflow states
    const STATE_PENDING = 'pending';
    const STATE_APPROVED = 'approved';
    const STATE_REJECTED = 'rejected';
    const STATE_ASSIGNED_TO_PLANNER = 'assigned_to_planner';
    const STATE_WORK_ORDER_CREATED = 'work_order_created';
    const STATE_IN_PROGRESS = 'in_progress';
    const STATE_TECHNICIAN_COMPLETED = 'technician_completed';
    const STATE_PLANNER_CONFIRMED = 'planner_confirmed';
    const STATE_SATISFACTORY = 'satisfactory';
    const STATE_SUPERVISOR_REJECTED = 'supervisor_rejected';
    const STATE_CLOSED = 'closed';
    
    // Valid state transitions
    private static $transitions = [
        self::STATE_PENDING => [self::STATE_APPROVED, self::STATE_REJECTED],
        self::STATE_APPROVED => [self::STATE_ASSIGNED_TO_PLANNER],
        self::STATE_ASSIGNED_TO_PLANNER => [self::STATE_WORK_ORDER_CREATED],
        self::STATE_WORK_ORDER_CREATED => [self::STATE_IN_PROGRESS],
        self::STATE_IN_PROGRESS => [self::STATE_TECHNICIAN_COMPLETED],
        self::STATE_TECHNICIAN_COMPLETED => [self::STATE_PLANNER_CONFIRMED],
        self::STATE_PLANNER_CONFIRMED => [self::STATE_SATISFACTORY, self::STATE_SUPERVISOR_REJECTED],
        self::STATE_SATISFACTORY => [self::STATE_CLOSED],
        self::STATE_SUPERVISOR_REJECTED => [self::STATE_WORK_ORDER_CREATED], // Reschedule
        self::STATE_REJECTED => [], // Terminal state
        self::STATE_CLOSED => [] // Terminal state
    ];
    
    /**
     * Check if transition is valid
     */
    public static function canTransition($fromState, $toState)
    {
        if (!isset(self::$transitions[$fromState])) {
            return false;
        }
        
        return in_array($toState, self::$transitions[$fromState]);
    }
    
    /**
     * Get allowed next states
     */
    public static function getAllowedTransitions($currentState)
    {
        return self::$transitions[$currentState] ?? [];
    }
    
    /**
     * Validate and execute transition
     */
    public static function transition($requestId, $fromState, $toState, $userId, $notes = null)
    {
        if (!self::canTransition($fromState, $toState)) {
            throw new \Exception("Invalid transition from {$fromState} to {$toState}");
        }
        
        $db = \Config\Database::connect();
        
        // Record in workflow history
        $db->table('maintenance_request_workflow')->insert([
            'request_id' => $requestId,
            'from_status' => $fromState,
            'to_status' => $toState,
            'action_by' => $userId,
            'action_type' => self::getActionType($toState),
            'notes' => $notes,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return true;
    }
    
    /**
     * Get action type from state
     */
    private static function getActionType($state)
    {
        $actionMap = [
            self::STATE_APPROVED => 'approved',
            self::STATE_REJECTED => 'rejected',
            self::STATE_ASSIGNED_TO_PLANNER => 'assigned',
            self::STATE_WORK_ORDER_CREATED => 'converted',
            self::STATE_IN_PROGRESS => 'started',
            self::STATE_TECHNICIAN_COMPLETED => 'completed',
            self::STATE_PLANNER_CONFIRMED => 'confirmed',
            self::STATE_SATISFACTORY => 'verified',
            self::STATE_SUPERVISOR_REJECTED => 'rejected',
            self::STATE_CLOSED => 'closed'
        ];
        
        return $actionMap[$state] ?? 'updated';
    }
}
