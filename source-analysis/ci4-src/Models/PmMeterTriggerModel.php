<?php

namespace App\Models;

use CodeIgniter\Model;

class PmMeterTriggerModel extends Model
{
    protected $table = 'pm_meter_triggers';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'pm_schedule_id', 'meter_id', 'trigger_value', 'last_reading',
        'last_wo_generated_at', 'active'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'pm_schedule_id' => 'required|integer',
        'meter_id' => 'required|integer',
        'trigger_value' => 'required|integer'
    ];
}
