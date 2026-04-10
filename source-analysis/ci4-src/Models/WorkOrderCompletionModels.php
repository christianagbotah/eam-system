<?php

namespace App\Models;

use CodeIgniter\Model;

class TechnicianTimeLogModel extends Model
{
    protected $table = 'technician_time_logs';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'technician_id', 'clock_in', 'clock_out', 
        'break_duration', 'actual_hours', 'activity_description', 
        'work_type', 'location', 'is_overtime', 'status'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}

class WorkOrderMaterialsUsedModel extends Model
{
    protected $table = 'work_order_materials_used';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'part_id', 'technician_id', 'quantity_requested',
        'quantity_used', 'quantity_returned', 'issued_by', 'issued_at',
        'returned_at', 'unit_cost', 'total_cost', 'notes'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}

class WorkOrderCompletionReportModel extends Model
{
    protected $table = 'work_order_completion_reports';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'team_leader_id', 'work_performed', 'root_cause',
        'corrective_actions', 'observations', 'recommendations',
        'quality_check_passed', 'quality_notes', 'actual_start_time',
        'actual_end_time', 'total_hours', 'downtime_hours', 'report_status',
        'submitted_at', 'approved_by', 'approved_at', 'rejection_reason'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}

class WorkOrderSignatureModel extends Model
{
    protected $table = 'work_order_signatures';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'user_id', 'role', 'signature_type',
        'signature_data', 'signed_at', 'comments'
    ];
    protected $useTimestamps = false;
}

class WorkOrderAttachmentModel extends Model
{
    protected $table = 'work_order_attachments';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'uploaded_by', 'file_name', 'file_path',
        'file_type', 'file_size', 'attachment_type', 'description'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}
