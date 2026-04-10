<?php

namespace App\Models;

use CodeIgniter\Model;

class PmInspectionDetailModel extends Model
{
    protected $table = 'pm_inspection_details';
    protected $primaryKey = 'detail_id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'record_id', 'part_id', 'checklist_item_id', 'method_name',
        'standard_value', 'measured_value', 'visual_condition', 'remark', 'status'
    ];
    protected $useTimestamps = false;
}
