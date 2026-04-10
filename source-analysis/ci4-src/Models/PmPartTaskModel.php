<?php

namespace App\Models;

use CodeIgniter\Model;

class PmPartTaskModel extends Model
{
    protected $table = 'pm_part_tasks';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'part_id', 'task_name', 'task_description', 'frequency_value', 
        'estimated_duration', 
        'pm_type_id', 'pm_trigger_id', 'pm_mode_id', 'pm_inspection_type_id', 'is_active'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'part_id' => 'required|is_natural_no_zero',
        'task_name' => 'required|max_length[200]',
        'frequency_value' => 'required|is_natural_no_zero',
        'pm_trigger_id' => 'required|is_natural_no_zero'
    ];

    public function getTasksByPartId($partId)
    {
        return $this->where('part_id', $partId)
            ->where('is_active', 1)
            ->findAll();
    }

    public function getTasksWithPartInfo($equipmentId = null)
    {
        $builder = $this->db->table('pm_part_tasks pt')
            ->select('pt.*, p.name as part_name, p.part_number, 
                     a.name as assembly_name, e.name as equipment_name, e.id as equipment_id')
            ->join('parts p', 'pt.part_id = p.id')
            ->join('assemblies a', 'p.assembly_id = a.id')
            ->join('equipment e', 'a.equipment_id = e.id')
            ->where('pt.is_active', 1);

        if ($equipmentId) {
            $builder->where('e.id', $equipmentId);
        }

        return $builder->orderBy('e.name', 'ASC')
            ->orderBy('a.name', 'ASC')
            ->orderBy('p.name', 'ASC')
            ->get()->getResultArray();
    }
}
