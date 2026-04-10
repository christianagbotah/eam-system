<?php

namespace App\Models;

use CodeIgniter\Model;

class EquipmentCategoryModel extends Model
{
    protected $table            = 'equipment_categories';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'name', 'description', 'color_code', 'icon'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $validationRules = [
        'name' => 'required|max_length[100]|is_unique[equipment_categories.name,id,{id}]'
    ];

    public function getCategoriesWithCount()
    {
        return $this->db->table('equipment_categories ec')
            ->select('ec.*, COUNT(e.id) as equipment_count')
            ->join('equipment e', 'ec.id = e.category_id', 'left')
            ->groupBy('ec.id')
            ->orderBy('ec.name', 'ASC')
            ->get()
            ->getResultArray();
    }
}