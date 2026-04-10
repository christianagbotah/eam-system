<?php

namespace App\Models;

use CodeIgniter\Model;

class PermitToWorkModel extends Model
{
    protected $table = 'permits_to_work';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'permit_number', 'permit_type', 'work_order_id', 'location', 'equipment_id',
        'work_description', 'hazards_identified', 'risk_level', 'control_measures',
        'ppe_required', 'emergency_procedures', 'requested_by', 'supervisor_id',
        'safety_officer_id', 'area_manager_id', 'authorized_workers', 'valid_from',
        'valid_until', 'extended', 'work_started_at', 'work_completed_at',
        'permit_closed_by', 'permit_closed_at', 'pre_work_inspection',
        'post_work_inspection', 'incidents_reported', 'status'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}

class PermitApprovalModel extends Model
{
    protected $table = 'permit_approvals';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'permit_id', 'approver_id', 'approval_level', 'approved', 'comments', 'approved_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}

class PermitExtensionModel extends Model
{
    protected $table = 'permit_extensions';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'permit_id', 'extended_by', 'reason', 'previous_valid_until',
        'new_valid_until', 'approved_by', 'approved_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}
