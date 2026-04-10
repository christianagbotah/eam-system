<?php

namespace App\Models;

use CodeIgniter\Model;

class ResourceAvailabilityModel extends Model
{
    protected $table = 'resource_availability';
    protected $primaryKey = 'id';
    protected $allowedFields = ['resource_type', 'resource_id', 'resource_name', 'work_center_id', 'available_from', 'available_to', 'capacity', 'allocated', 'status'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
