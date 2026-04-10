<?php

namespace App\Models;

use CodeIgniter\Model;

class SkillModel extends Model
{
    protected $table = 'skills';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'skill_name', 'skill_code', 'description', 'category', 'category_id', 'required_for_role', 'is_active'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'name' => 'permit_empty|min_length[2]|max_length[100]',
        'skill_name' => 'permit_empty|min_length[2]|max_length[100]',
    ];

    protected $validationMessages = [
        'name' => [
            'min_length' => 'Skill name must be at least 2 characters',
        ],
        'skill_name' => [
            'min_length' => 'Skill name must be at least 2 characters',
        ],
    ];
    
    protected $beforeInsert = ['handleCategory', 'normalizeFields'];
    protected $beforeUpdate = ['handleCategory', 'normalizeFields'];
    protected $afterFind = ['addCategoryId'];
    
    protected function normalizeFields(array $data)
    {
        if (isset($data['data']['skill_name']) && !isset($data['data']['name'])) {
            $data['data']['name'] = $data['data']['skill_name'];
        }
        if (isset($data['data']['name']) && !isset($data['data']['skill_name'])) {
            $data['data']['skill_name'] = $data['data']['name'];
        }
        return $data;
    }
    
    protected function handleCategory(array $data)
    {
        if (isset($data['data']['category_id']) && !empty($data['data']['category_id'])) {
            $categoryModel = new \App\Models\SkillCategoryModel();
            $category = $categoryModel->find($data['data']['category_id']);
            if ($category) {
                $data['data']['category'] = $category['category_name'];
            }
        }
        return $data;
    }
    
    protected function addCategoryId(array $data)
    {
        if (isset($data['data'])) {
            if (is_array($data['data']) && isset($data['data'][0])) {
                foreach ($data['data'] as &$row) {
                    $this->enrichRow($row);
                }
            } else {
                $this->enrichRow($data['data']);
            }
        }
        return $data;
    }
    
    private function enrichRow(&$row)
    {
        if (isset($row['name']) && !isset($row['skill_name'])) {
            $row['skill_name'] = $row['name'];
        }
        if (isset($row['category']) && !empty($row['category'])) {
            $categoryModel = new \App\Models\SkillCategoryModel();
            $category = $categoryModel->where('category_name', $row['category'])->first();
            if ($category) {
                $row['category_id'] = $category['id'];
            }
        }
    }
}
