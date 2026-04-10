<?php
namespace App\Models;

use CodeIgniter\Model;

class RiskControlMeasureModel extends Model {
    protected $table = 'risk_control_measures';
    protected $primaryKey = 'id';
    protected $allowedFields = ['assessment_id', 'measure_text', 'measure_type', 'owner', 'due_date', 'priority', 'status', 'completed_at', 'verified_by', 'verified_at'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = '';
}
