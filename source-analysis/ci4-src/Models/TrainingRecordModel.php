<?php

namespace App\Models;

use CodeIgniter\Model;

class TrainingRecordModel extends Model
{
    protected $table = 'training_records';
    protected $primaryKey = 'id';
    protected $allowedFields = ['employee_id', 'training_type', 'training_date', 'expiry_date', 'trainer', 'score', 'certificate_number', 'status'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
