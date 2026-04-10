<?php

namespace App\Models;

use CodeIgniter\Model;

class TechnicianSkillModel extends Model
{
    protected $table = 'technician_skills';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'technician_id', 'skill_name', 'proficiency_level', 'certified',
        'certification_date', 'certification_expiry', 'years_experience',
        'verified_by', 'verified_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $validationRules = [
        'technician_id' => 'required|integer',
        'skill_name' => 'required|max_length[100]',
        'proficiency_level' => 'required|in_list[beginner,intermediate,advanced,expert]',
        'years_experience' => 'decimal'
    ];
}
