<?php

namespace App\Models;

use CodeIgniter\Model;

class ERPScheduleModel extends Model
{
    protected $table = 'erp_sync_schedules';
    protected $primaryKey = 'id';
    protected $allowedFields = ['entity_type', 'sync_direction', 'frequency', 'time_of_day', 'day_of_week', 'is_active', 'last_run', 'next_run'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
