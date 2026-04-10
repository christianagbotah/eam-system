<?php

namespace App\Models;

use CodeIgniter\Model;

// Work Order Interruptions
class WorkOrderInterruptionModel extends Model
{
    protected $table = 'work_order_interruptions';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id', 'interruption_type', 'started_at', 'ended_at',
        'duration_minutes', 'auto_detected', 'technician_id', 'notes'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}

// Part Substitutions
class WorkOrderPartSubstitutionModel extends Model
{
    protected $table = 'work_order_part_substitutions';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id', 'original_part_id', 'substitute_part_id', 'is_fabricated',
        'fabrication_details', 'reason', 'quantity', 'cost_difference',
        'approved_by', 'approved_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}

// Work Order Delays
class WorkOrderDelayModel extends Model
{
    protected $table = 'work_order_delays';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id', 'delay_type', 'delay_start', 'delay_end',
        'duration_hours', 'part_id', 'expected_availability_date',
        'impact', 'notes', 'created_by'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}

// Authority Overrides
class WorkOrderAuthorityOverrideModel extends Model
{
    protected $table = 'work_order_authority_overrides';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id', 'override_type', 'original_value', 'new_value',
        'overridden_by', 'override_reason', 'approved_by', 'approved_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}

// Audit Log
class WorkOrderAuditLogModel extends Model
{
    protected $table = 'work_order_audit_log';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'work_order_id', 'action_type', 'entity_type', 'entity_id',
        'field_changed', 'old_value', 'new_value', 'changed_by',
        'changed_at', 'ip_address', 'user_agent'
    ];
    protected $useTimestamps = false;
}

// Failure Analysis
class AssetFailureAnalysisModel extends Model
{
    protected $table = 'asset_failure_analysis';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'asset_id', 'work_order_id', 'failure_date', 'failure_code_id',
        'root_cause', 'contributing_factors', 'corrective_action',
        'preventive_recommendation', 'recurrence_risk', 'cost_impact',
        'downtime_hours', 'analyzed_by', 'analyzed_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}

// Cost Trends
class MaintenanceCostTrendModel extends Model
{
    protected $table = 'maintenance_cost_trends';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'period_type', 'period_start', 'period_end', 'asset_id', 'department_id',
        'total_labor_cost', 'total_parts_cost', 'total_external_cost',
        'total_downtime_cost', 'total_cost', 'work_order_count',
        'emergency_count', 'preventive_count', 'calculated_at'
    ];
}

// Downtime Cause Analysis
class DowntimeCauseAnalysisModel extends Model
{
    protected $table = 'downtime_cause_analysis';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'asset_id', 'work_order_id', 'downtime_start', 'downtime_end',
        'duration_hours', 'primary_cause', 'secondary_causes',
        'production_loss_units', 'revenue_loss', 'preventable'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}

// Labor Rate Config
class LaborRateConfigModel extends Model
{
    protected $table = 'labor_rate_config';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'labor_type', 'base_multiplier', 'description',
        'effective_from', 'effective_to', 'active'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
