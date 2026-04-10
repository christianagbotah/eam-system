<?php

namespace App\Models;

use CodeIgniter\Model;

class DowntimeEventModel extends Model
{
    protected $table = 'downtime_events';
    protected $primaryKey = 'id';
    protected $allowedFields = ['asset_id', 'start_time', 'end_time', 'duration_minutes', 'reason', 'category', 'notes'];
    protected $useTimestamps = true;
}
