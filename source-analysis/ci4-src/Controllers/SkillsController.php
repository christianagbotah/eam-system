<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class SkillsController extends ResourceController
{
    use ResponseTrait;

    protected $modelName = 'App\Models\SkillModel';
    protected $format = 'json';

    public function index()
    {
        try {
            $skills = $this->model->orderBy('skill_name', 'ASC')->findAll();
            return $this->respond(['status' => 'success', 'data' => $skills]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function show($id = null)
    {
        try {
            $skill = $this->model->find($id);
            if (!$skill) {
                return $this->failNotFound('Skill not found');
            }
            return $this->respond(['status' => 'success', 'data' => $skill]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function create()
    {
        try {
            $data = $this->request->getJSON(true);
            
            // Handle category_id if provided
            if (isset($data['category_id'])) {
                $data['category'] = $data['category_id'];
                unset($data['category_id']);
            }
            
            if ($this->model->insert($data)) {
                return $this->respondCreated(['status' => 'success', 'message' => 'Skill created successfully']);
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
            
            // Handle category_id if provided
            if (isset($data['category_id'])) {
                $data['category'] = $data['category_id'];
                unset($data['category_id']);
            }
            
            if ($this->model->update($id, $data)) {
                return $this->respond(['status' => 'success', 'message' => 'Skill updated successfully']);
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
                return $this->respondDeleted(['status' => 'success', 'message' => 'Skill deleted successfully']);
            }
            
            return $this->fail('Failed to delete skill');
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
}
