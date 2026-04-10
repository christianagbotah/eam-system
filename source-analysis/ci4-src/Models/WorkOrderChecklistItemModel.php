<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderChecklistItemModel extends Model
{
    protected $table = 'work_order_checklist_items';
    protected $primaryKey = 'id';
    protected $allowedFields = ['work_order_id', 'item_order', 'item_type', 'description', 'response_value', 'is_completed', 'completed_by', 'completed_at'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
}
