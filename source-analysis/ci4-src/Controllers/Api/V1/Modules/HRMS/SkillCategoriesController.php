<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseResourceController;
use CodeIgniter\API\ResponseTrait;

class SkillCategoriesController extends BaseResourceController
{
    use ResponseTrait;

    protected $modelName = 'App\Models\SkillCategoryModel';
    protected $format = 'json';

    public function index()
    {
        try {
            $categories = $this->model->where('is_active', 1)->orderBy('category_name', 'ASC')->findAll();
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

    public function show($id = null)
    {
        try {
            $category = $this->model->find($id);
            if (!$category) {
                return $this->failNotFound('Category not found');
            }
            return $this->respond(['status' => 'success', 'data' => $category]);
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

    public function delete($id = null)
    {
        try {
            if ($this->model->delete($id)) {
                return $this->respondDeleted(['status' => 'success', 'message' => 'Category deleted successfully']);
            }
            
            return $this->fail('Failed to delete category');
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
}
