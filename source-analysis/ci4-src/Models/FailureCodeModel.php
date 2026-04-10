<?php

namespace App\Models;

use CodeIgniter\Model;

class FailureCodeModel extends Model
{
    protected $table = 'failure_codes';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['code', 'description', 'category', 'severity', 'is_active'];
    protected $useTimestamps = true;
    protected $validationRules = [
        'code' => 'required|max_length[50]|is_unique[failure_codes.code,id,{id}]',
        'description' => 'required|max_length[255]',
        'category' => 'required|in_list[mechanical,electrical,hydraulic,pneumatic,software,other]',
        'severity' => 'required|in_list[minor,moderate,major,critical]'
    ];

    public function getActive()
    {
        return $this->where('is_active', 1)->orderBy('category', 'ASC')->findAll();
    }

    public function getByCategory($category)
    {
        return $this->where(['category' => $category, 'is_active' => 1])->findAll();
    }
}
