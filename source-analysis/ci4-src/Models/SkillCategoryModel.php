<?php

namespace App\Models;

use CodeIgniter\Model;

class SkillCategoryModel extends Model
{
    protected $table = 'skill_categories';
    protected $primaryKey = 'id';
    protected $allowedFields = ['category_name', 'description', 'is_active'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'category_name' => 'required|min_length[2]|max_length[100]',
    ];

    protected $validationMessages = [
        'category_name' => [
            'required' => 'Category name is required',
            'min_length' => 'Category name must be at least 2 characters',
        ],
    ];
}
