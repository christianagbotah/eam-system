<?php

namespace App\Models;

use CodeIgniter\Model;

class PmInspectionRecordModel extends Model
{
    protected $table = 'pm_inspection_records';
    protected $primaryKey = 'record_id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'tracking_id', 'equipment_id', 'part_id', 'inspection_type_id',
        'technician_name', 'inspection_date', 'total_time', 'overall_notes',
        'overall_status', 'completed_by'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
