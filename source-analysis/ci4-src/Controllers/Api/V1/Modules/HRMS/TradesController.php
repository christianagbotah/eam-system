<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseResourceController;

class TradesController extends BaseResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        $trades = $db->table('skills')->orderBy('skill_name', 'ASC')->get()->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $trades
        ]);
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();
        $trade = $db->table('skills')->where('id', $id)->get()->getRowArray();
        
        if (!$trade) {
            return $this->failNotFound('Trade not found');
        }
        
        return $this->respond([
            'status' => 'success',
            'data' => $trade
        ]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        
        $validation = \Config\Services::validation();
        $validation->setRules([
            'skill_name' => 'required|min_length[2]|max_length[100]',
            'skill_code' => 'permit_empty|max_length[50]',
            'description' => 'permit_empty'
        ]);

        if (!$validation->run($data)) {
            return $this->failValidationErrors($validation->getErrors());
        }

        $db = \Config\Database::connect();
        $db->table('skills')->insert([
            'skill_name' => $data['skill_name'],
            'skill_code' => $data['skill_code'] ?? null,
            'description' => $data['description'] ?? null,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respondCreated([
            'status' => 'success',
            'message' => 'Trade created successfully',
            'data' => ['id' => $db->insertID()]
        ]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $trade = $db->table('skills')->where('id', $id)->get()->getRowArray();
        
        if (!$trade) {
            return $this->failNotFound('Trade not found');
        }

        $data = $this->request->getJSON(true);
        
        $validation = \Config\Services::validation();
        $validation->setRules([
            'skill_name' => 'required|min_length[2]|max_length[100]',
            'skill_code' => 'permit_empty|max_length[50]',
            'description' => 'permit_empty'
        ]);

        if (!$validation->run($data)) {
            return $this->failValidationErrors($validation->getErrors());
        }

        $db->table('skills')->where('id', $id)->update([
            'skill_name' => $data['skill_name'],
            'skill_code' => $data['skill_code'] ?? null,
            'description' => $data['description'] ?? null,
            'updated_at' => date('Y-m-d H:i:s')
        ]);

        return $this->respond([
            'status' => 'success',
            'message' => 'Trade updated successfully'
        ]);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        $trade = $db->table('skills')->where('id', $id)->get()->getRowArray();
        
        if (!$trade) {
            return $this->failNotFound('Trade not found');
        }

        $db->table('skills')->where('id', $id)->delete();

        return $this->respondDeleted([
            'status' => 'success',
            'message' => 'Trade deleted successfully'
        ]);
    }

    public function assignToUser($userId = null)
    {
        $data = $this->request->getJSON(true);
        
        $validation = \Config\Services::validation();
        $validation->setRules([
            'skill_ids' => 'required|is_array',
            'skill_ids.*' => 'required|integer'
        ]);

        if (!$validation->run($data)) {
            return $this->failValidationErrors($validation->getErrors());
        }

        $db = \Config\Database::connect();
        
        // Remove existing skills
        $db->table('user_skills')->where('user_id', $userId)->delete();
        
        // Add new skills
        foreach ($data['skill_ids'] as $skillId) {
            $db->table('user_skills')->insert([
                'user_id' => $userId,
                'skill_id' => $skillId,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }

        return $this->respond([
            'status' => 'success',
            'message' => 'Trades assigned successfully'
        ]);
    }

    public function getUserTrades($userId = null)
    {
        $db = \Config\Database::connect();
        $trades = $db->table('user_skills us')
            ->select('s.*, us.created_at as assigned_at')
            ->join('skills s', 's.id = us.skill_id')
            ->where('us.user_id', $userId)
            ->get()->getResultArray();
        
        return $this->respond([
            'status' => 'success',
            'data' => $trades
        ]);
    }
}
