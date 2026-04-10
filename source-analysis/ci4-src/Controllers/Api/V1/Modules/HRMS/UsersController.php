<?php

namespace App\Controllers\Api\V1\Modules\HRMS;

use App\Controllers\Api\V1\BaseApiController;
use App\Traits\PlantScopeTrait;
use App\Services\EamUserService;

class UsersController extends BaseApiController
{
    use PlantScopeTrait;
    
    protected $service;

    public function __construct()
    {
        $this->service = new EamUserService();
    }

    public function index()
    {
        $params = $this->request->getGet();
        $params['plant_id'] = $this->getPlantId();
        
        $result = $this->service->getAll($params);
        return $this->respond($result);
    }

    public function show($id = null)
    {
        if (!$this->checkPermission('users', 'view')) {
            return $this->failForbidden('Insufficient permissions');
        }

        $result = $this->service->getById($id, $this->getPlantId());
        return $this->respond($result);
    }

    public function create()
    {
        if (!$this->checkPermission('users', 'create')) {
            return $this->failForbidden('Insufficient permissions');
        }

        $data = $this->request->getJSON(true);
        $data['plant_id'] = $this->getPlantId();
        
        $result = $this->service->create($data);
        
        // Handle multi-plant assignment
        if ($result['status'] === 'success' && isset($data['plant_ids']) && is_array($data['plant_ids'])) {
            $userId = $result['data']['id'];
            $this->assignUserToPlants($userId, $data['plant_ids'], $data['plant_id']);
        }
        
        return $this->respond($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function update($id = null)
    {
        if (!$this->checkPermission('users', 'update')) {
            return $this->failForbidden('Insufficient permissions');
        }

        $data = $this->request->getJSON(true);
        unset($data['plant_id']); // Prevent plant_id changes
        
        // Skip validation for updates - handle in service
        $this->skipValidation = true;
        
        $result = $this->service->update($id, $data, $this->getPlantId());
        
        // Handle multi-plant assignment update
        if ($result['status'] === 'success' && isset($data['plant_ids']) && is_array($data['plant_ids'])) {
            $primaryPlantId = $data['primary_plant_id'] ?? null;
            $this->assignUserToPlants($id, $data['plant_ids'], $primaryPlantId);
        }
        
        return $this->respond($result);
    }

    public function delete($id = null)
    {
        if (!$this->checkPermission('users', 'delete')) {
            return $this->failForbidden('Insufficient permissions');
        }

        $result = $this->service->delete($id, $this->getPlantId());
        return $this->respond($result);
    }

    public function assignRole($id = null)
    {
        $data = $this->request->getJSON(true);
        $result = $this->service->assignRole($id, $data['role_id']);
        return $this->respond($result);
    }

    /**
     * Assign user to multiple plants
     */
    protected function assignUserToPlants($userId, $plantIds, $primaryPlantId = null)
    {
        $db = \Config\Database::connect();
        
        // Remove existing assignments
        $db->table('user_plants')->where('user_id', $userId)->delete();
        
        // Add new assignments
        foreach ($plantIds as $plantId) {
            $db->table('user_plants')->insert([
                'user_id' => $userId,
                'plant_id' => $plantId,
                'is_primary' => ($plantId == $primaryPlantId) ? 1 : 0,
                'access_level' => 'write',
                'created_at' => date('Y-m-d H:i:s')
            ]);
        }
        
        // Update user's primary plant_id
        if ($primaryPlantId) {
            $db->table('users')
                ->where('id', $userId)
                ->update(['plant_id' => $primaryPlantId, 'default_plant_id' => $primaryPlantId]);
        }
    }

    /**
     * Get user's assigned plants
     */
    public function getUserPlants($id = null)
    {
        $db = \Config\Database::connect();
        
        $plants = $db->table('user_plants up')
            ->select('up.*, p.plant_name, p.plant_code, p.location')
            ->join('plants p', 'p.id = up.plant_id')
            ->where('up.user_id', $id)
            ->get()
            ->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $plants]);
    }
}

