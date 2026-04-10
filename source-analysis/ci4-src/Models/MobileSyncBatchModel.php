<?php

namespace App\Models;

use CodeIgniter\Model;

class MobileSyncBatchModel extends Model
{
    protected $table = 'mobile_sync_batches';
    protected $primaryKey = 'id';
    protected $allowedFields = ['batch_id', 'user_id', 'operations', 'status', 'result_mapping', 'error_message', 'processed_at'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}
