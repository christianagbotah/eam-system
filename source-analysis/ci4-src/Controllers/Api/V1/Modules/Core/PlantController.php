<?php
namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\Api\V1\BaseApiController;
use CodeIgniter\HTTP\ResponseInterface;

class PlantController extends BaseApiController
{
    protected $plantModel;
    protected $userPlantModel;
    
    public function initializeService()
    {
        parent::initializeService();
        $this->plantModel = model('App\Models\CORE\PlantModel');
        $this->userPlantModel = model('App\Models\CORE\UserPlantModel');
    }
    
    /**
     * Get all plants (admin only)
     */
    public function index()
    {
        if (!$this->plantModel) {
            $this->initializeService();
        }
        
        if (!$this->checkPermission('plants.view')) {
            return $this->respond(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
        
        $plants = $this->plantModel->where('is_active', 1)->findAll();
        return $this->respond(['status' => 'success', 'data' => $plants]);
    }
    
    /**
     * Get plants accessible by current user
     */
    public function getUserPlants()
    {
        if (!$this->plantModel) {
            $this->initializeService();
        }
        
        // Get user ID from JWT token stored in GLOBALS by JWTAuthFilter
        $userId = $GLOBALS['jwt_user_id'] ?? null;
        
        if (!$userId) {
            return $this->respond(['status' => 'error', 'message' => 'User not authenticated'], 401);
        }
        
        $plants = $this->plantModel
            ->select('plants.*')
            ->join('user_plants', 'user_plants.plant_id = plants.id')
            ->where('user_plants.user_id', $userId)
            ->where('plants.is_active', 1)
            ->findAll();
        
        return $this->respond(['status' => 'success', 'data' => $plants]);
    }
    
    /**
     * Switch active plant for user
     */
    public function switchPlant()
    {
        if (!$this->userPlantModel) {
            $this->initializeService();
        }
        
        try {
            // Get raw input for debugging
            $rawInput = file_get_contents('php://input');
            log_message('info', 'Switch plant - Raw input: ' . $rawInput);
            log_message('info', 'Switch plant - Content-Type: ' . $this->request->getHeaderLine('Content-Type'));
            
            // Try multiple ways to get plant_id
            $plantId = null;
            
            // Method 1: getJSON
            $json = $this->request->getJSON();
            if ($json && isset($json->plant_id)) {
                $plantId = $json->plant_id;
                log_message('info', 'Switch plant - Got plant_id from getJSON: ' . $plantId);
            }
            
            // Method 2: getPost
            if (!$plantId) {
                $plantId = $this->request->getPost('plant_id');
                if ($plantId) {
                    log_message('info', 'Switch plant - Got plant_id from getPost: ' . $plantId);
                }
            }
            
            // Method 3: getVar
            if (!$plantId) {
                $plantId = $this->request->getVar('plant_id');
                if ($plantId) {
                    log_message('info', 'Switch plant - Got plant_id from getVar: ' . $plantId);
                }
            }
            
            $userId = $GLOBALS['jwt_user_id'] ?? $GLOBALS['user_id'] ?? session()->get('user_id');
            
            if (!$userId) {
                log_message('error', 'Switch plant - No user ID found');
                return $this->respond(['status' => 'error', 'message' => 'User not authenticated'], 401);
            }
            
            if (!$plantId) {
                log_message('error', 'Switch plant - No plant_id provided');
                return $this->respond(['status' => 'error', 'message' => 'Plant ID required'], 400);
            }
            
            // Verify user has access to this plant
            $hasAccess = $this->userPlantModel
                ->where('user_id', $userId)
                ->where('plant_id', $plantId)
                ->first();
            
            if (!$hasAccess) {
                log_message('error', "Switch plant - User {$userId} has no access to plant {$plantId}");
                return $this->respond(['status' => 'error', 'message' => 'Access denied to this plant'], 403);
            }
            
            // Update session
            session()->set('default_plant_id', $plantId);
            
            $this->auditLog('switch_plant', 'plant', $plantId, ['user_id' => $userId]);
            
            log_message('info', "Switch plant SUCCESS - User {$userId} switched to plant {$plantId}");
            return $this->respond(['status' => 'success', 'data' => ['plant_id' => $plantId], 'message' => 'Plant switched successfully']);
        } catch (\Exception $e) {
            log_message('error', 'Switch plant exception: ' . $e->getMessage() . ' | ' . $e->getTraceAsString());
            return $this->respond(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
    
    /**
     * Create new plant (admin only)
     */
    public function create()
    {
        if (!$this->plantModel) {
            $this->initializeService();
        }
        
        if (!$this->checkPermission('plants.create')) {
            return $this->respond(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
        
        $data = [
            'plant_code' => $this->request->getPost('plant_code'),
            'plant_name' => $this->request->getPost('plant_name'),
            'location' => $this->request->getPost('location'),
            'country' => $this->request->getPost('country'),
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $validation = \Config\Services::validation();
        $validation->setRules([
            'plant_code' => 'required|is_unique[plants.plant_code]',
            'plant_name' => 'required|min_length[3]'
        ]);
        
        if (!$validation->run($data)) {
            return $this->respond(['status' => 'error', 'message' => 'Validation failed', 'errors' => $validation->getErrors()], 400);
        }
        
        $plantId = $this->plantModel->insert($data);
        
        if ($plantId) {
            $this->auditLog('create', 'plant', $plantId, $data);
            return $this->respond(['status' => 'success', 'data' => ['id' => $plantId], 'message' => 'Plant created successfully'], 201);
        }
        
        return $this->respond(['status' => 'error', 'message' => 'Failed to create plant'], 500);
    }
    
    /**
     * Assign user to plant
     */
    public function assignUser()
    {
        if (!$this->userPlantModel) {
            $this->initializeService();
        }
        
        if (!$this->checkPermission('plants.assign_users')) {
            return $this->respond(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }
        
        $userId = $this->request->getPost('user_id');
        $plantId = $this->request->getPost('plant_id');
        $isPrimary = $this->request->getPost('is_primary') ?? 0;
        
        if (!$userId || !$plantId) {
            return $this->respond(['status' => 'error', 'message' => 'User ID and Plant ID required'], 400);
        }
        
        // Check if assignment already exists
        $existing = $this->userPlantModel
            ->where('user_id', $userId)
            ->where('plant_id', $plantId)
            ->first();
        
        if ($existing) {
            return $this->respond(['status' => 'error', 'message' => 'User already assigned to this plant'], 400);
        }
        
        // If setting as primary, unset other primary plants for this user
        if ($isPrimary) {
            $this->userPlantModel
                ->where('user_id', $userId)
                ->set(['is_primary' => 0])
                ->update();
        }
        
        $data = [
            'user_id' => $userId,
            'plant_id' => $plantId,
            'is_primary' => $isPrimary,
            'created_at' => date('Y-m-d H:i:s')
        ];
        
        $id = $this->userPlantModel->insert($data);
        
        if ($id) {
            $this->auditLog('assign_user', 'plant', $plantId, $data);
            return $this->respond(['status' => 'success', 'data' => ['id' => $id], 'message' => 'User assigned to plant successfully']);
        }
        
        return $this->respond(['status' => 'error', 'message' => 'Failed to assign user to plant'], 500);
    }
}
