<?php

namespace App\Models;

use CodeIgniter\Model;

class PartChecklistTemplateModel extends Model
{
    protected $table = 'part_checklist_templates';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = ['part_id', 'template_id', 'custom_ranges', 'is_active'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}