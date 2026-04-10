<?php

namespace App\Models;

use CodeIgniter\Model;

class NotificationJobModel extends Model
{
    protected $table = 'notification_jobs';
    protected $primaryKey = 'id';
    protected $allowedFields = ['user_id', 'channel', 'type', 'data', 'status', 'attempts', 'error', 'created_at', 'processed_at'];
    protected $useTimestamps = false;
    protected $returnType = 'array';
}
