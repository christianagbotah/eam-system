<?php

namespace App\Models;

use CodeIgniter\Model;

class CalibrationScheduleModel extends Model
{
    protected $table = 'calibration_schedules';
    protected $primaryKey = 'id';
    protected $allowedFields = ['asset_id', 'calibration_type', 'frequency_days', 'last_calibration_date', 'next_calibration_date', 'status', 'notes'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
