<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductionRunModel extends Model
{
    protected $table = 'production_runs';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'batch_no',
        'product_id',
        'asset_id',
        'start_time',
        'end_time',
        'produced_qty',
        'created_at',
        'updated_at'
    ];
    protected $useTimestamps = false;
}
