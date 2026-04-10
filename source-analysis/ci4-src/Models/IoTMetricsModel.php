<?php
namespace App\Models;

use CodeIgniter\Model;

class IoTMetricsModel extends Model
{
    protected $table = 'iot_metrics';
    protected $primaryKey = 'id';
    protected $allowedFields = ['device_id', 'asset_id', 'metric_type', 'value', 'timestamp'];
    protected $useTimestamps = false;
}
