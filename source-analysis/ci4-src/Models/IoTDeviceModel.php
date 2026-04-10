<?php
namespace App\Models;

use CodeIgniter\Model;

class IoTDeviceModel extends Model
{
    protected $table = 'iot_devices';
    protected $primaryKey = 'id';
    protected $allowedFields = ['device_id', 'asset_id', 'device_type', 'status', 'last_seen', 'config'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
