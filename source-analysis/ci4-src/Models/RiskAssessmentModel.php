<?php

namespace App\Models;

use CodeIgniter\Model;

class RiskAssessmentModel extends Model
{
    protected $table = 'risk_assessments';
    protected $primaryKey = 'id';
    protected $allowedFields = ['asset_id', 'work_order_id', 'assessment_date', 'assessed_by', 'hazard_description', 'risk_category', 'likelihood', 'severity', 'risk_score', 'risk_level', 'mitigation_measures', 'status'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
