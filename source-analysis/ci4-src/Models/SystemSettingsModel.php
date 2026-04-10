<?php
namespace App\Models;

use CodeIgniter\Model;

class SystemSettingsModel extends Model
{
    protected $table = 'system_settings';
    protected $primaryKey = 'id';
    protected $allowedFields = ['setting_key', 'setting_value', 'category'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
