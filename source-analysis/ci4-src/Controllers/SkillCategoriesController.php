<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class SkillCategoriesController extends ResourceController
{
    use ResponseTrait;

    protected $modelName = 'App\Models\SkillCategoryModel';
    protected $format = 'json';

    public function index()
    {
        try {
            $categories = $this->model->orderBy('category_name', 'ASC')->findAll();
            return $this->respond(['status' => 'success', 'data' => $categories]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function create()
    {
        try {
            $data = $this->request->getJSON(true);
            
            if ($this->model->insert($data)) {
                $id = $this->model->getInsertID();
                $category = $this->model->find($id);
                return $this->respondCreated(['status' => 'success', 'message' => 'Category created successfully', 'data' => $category]);
            }
            
            return $this->fail($this->model->errors());
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function update($id = null)
    {
        try {
            $data = $this->request->getJSON(true);
            
            if ($this->model->update($id, $data)) {
                $category = $this->model->find($id);
                return $this->respond(['status' => 'success', 'message' => 'Category updated successfully', 'data' => $category]);
            }
            
            return $this->fail($this->model->errors());
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
}
