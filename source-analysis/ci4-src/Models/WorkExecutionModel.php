<?php
namespace App\Models;

use CodeIgniter\Model;

class WorkExecutionModel extends Model {
    protected $table = 'work_executions';
    protected $primaryKey = 'id';
    protected $allowedFields = ['execution_code', 'work_order_id', 'technician_id', 'team_members', 'start_time', 'end_time', 'actual_hours', 'break_time_minutes', 'travel_time_minutes', 'activities', 'checklist_items', 'parts_used', 'tools_used', 'safety_checks', 'permit_to_work', 'loto_applied', 'loto_number', 'hot_work_permit', 'confined_space_permit', 'findings', 'root_cause', 'corrective_action', 'recommendations', 'failure_code', 'downtime_impact_hours', 'production_loss_units', 'cost_labor', 'cost_parts', 'cost_total', 'quality_check_passed', 'quality_checked_by', 'quality_check_date', 'meter_readings', 'attachments', 'signature_technician', 'signature_supervisor', 'gps_location', 'weather_conditions', 'status', 'pause_reason', 'paused_at', 'completed_at', 'verified_by', 'verified_at'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
