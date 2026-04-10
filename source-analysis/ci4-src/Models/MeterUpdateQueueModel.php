<?php

namespace App\Models;

use CodeIgniter\Model;

class MeterUpdateQueueModel extends Model
{
    protected $table = 'meter_update_queue';
    protected $primaryKey = 'id';
    protected $allowedFields = ['meter_id', 'payload', 'status', 'last_error', 'attempts', 'created_at', 'updated_at'];
    protected $useTimestamps = false;
    protected $returnType = 'array';
}