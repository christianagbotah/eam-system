<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderSlaTrackingModel extends Model
{
    protected $table = 'work_order_sla_tracking';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'work_order_id', 'sla_definition_id', 'target_response_time',
        'actual_response_time', 'target_resolution_time', 'actual_resolution_time',
        'response_breached', 'resolution_breached', 'response_breach_duration',
        'resolution_breach_duration', 'current_escalation_level', 'escalated_to',
        'escalated_at', 'escalation_notes'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
