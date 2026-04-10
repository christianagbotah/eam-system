<?php
namespace App\Models;

use CodeIgniter\Model;

class IoTAlertsModel extends Model
{
    protected $table = 'iot_alerts';
    protected $primaryKey = 'id';
    protected $allowedFields = ['asset_id', 'metric_type', 'value', 'threshold', 'severity', 'acknowledged', 'acknowledged_at', 'acknowledged_by', 'created_at'];
    protected $useTimestamps = false;
}
