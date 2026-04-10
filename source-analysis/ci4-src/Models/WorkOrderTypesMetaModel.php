<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderTypesMetaModel extends Model
{
    protected $table = 'work_order_types_meta';
    protected $primaryKey = 'id';
    protected $allowedFields = ['work_order_type', 'default_checklist_template_id', 'default_required_tools', 'default_required_spares', 'default_priority', 'default_sla_hours'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
