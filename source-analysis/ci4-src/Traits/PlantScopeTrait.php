<?php

namespace App\Traits;

trait PlantScopeTrait
{
    protected function getPlantIds(): array
    {
        $activePlantId = $this->getPlantId();
        $userData = $this->getUserData();
        
        // Special case: 0 means "All Plants" for admin/manager roles
        if ($activePlantId === 0) {
            $userRole = $userData['role'] ?? null;
            
            // Only admin and manager can view all plants
            if (in_array($userRole, ['admin', 'manager'])) {
                return $this->getAllAccessiblePlantIds();
            }
            $activePlantId = null;
        }
        
        if ($activePlantId) {
            $accessiblePlants = $this->getAllAccessiblePlantIds();
            
            // Security: Validate plant access
            if (empty($accessiblePlants) || in_array($activePlantId, $accessiblePlants)) {
                return [$activePlantId];
            }
            
            log_message('warning', 'Unauthorized plant access attempt: User ' . ($userData['user_id'] ?? 'unknown') . ' tried to access plant ' . $activePlantId);
            return [];
        }
        
        // No active plant - return first accessible plant
        $accessiblePlants = $this->getAllAccessiblePlantIds();
        return !empty($accessiblePlants) ? [$accessiblePlants[0]] : [];
    }
    
    protected function getPlantId()
    {
        $request = \Config\Services::request();
        
        // Priority 1: X-Plant-ID header (validated)
        $headerPlantId = $request->getHeaderLine('X-Plant-ID');
        if ($headerPlantId !== '' && is_numeric($headerPlantId)) {
            return (int)$headerPlantId;
        }
        
        // Priority 2: Session
        $sessionPlantId = session()->get('active_plant_id');
        if ($sessionPlantId) {
            return (int)$sessionPlantId;
        }
        
        // Priority 3: User default plant
        $userData = $this->getUserData();
        return $userData['plant_id'] ?? null;
    }
    
    protected function getAllAccessiblePlantIds()
    {
        // Check session cache first
        $sessionPlantIds = session()->get('allowed_plant_ids');
        if (!empty($sessionPlantIds) && is_array($sessionPlantIds)) {
            return array_map('intval', $sessionPlantIds);
        }
        
        // Query database
        $userData = $this->getUserData();
        $userId = $userData['user_id'] ?? $userData['id'] ?? null;
        
        if (!$userId) {
            return [];
        }
        
        $db = \Config\Database::connect();
        $plants = $db->table('user_plants')
            ->select('plant_id')
            ->where('user_id', $userId)
            ->get()
            ->getResultArray();
        
        $plantIds = !empty($plants) ? array_map('intval', array_column($plants, 'plant_id')) : [];
        
        // Cache in session
        if (!empty($plantIds)) {
            session()->set('allowed_plant_ids', $plantIds);
        }
        
        return $plantIds;
    }
    
    protected function getUserData()
    {
        // Get from globals (set by JWT filter)
        if (isset($GLOBALS['jwt_user_data'])) {
            $data = $GLOBALS['jwt_user_data'];
            return is_array($data) ? $data : (array)$data;
        }
        
        // Fallback to session
        $sessionData = session()->get('user_data');
        if ($sessionData) {
            return $sessionData;
        }
        
        return [];
    }
    
    protected function applyPlantScope($query, $table = null)
    {
        $tableName = $table ?? ($this->table ?? null);
        
        // Skip plant scope for parts table (parts are filtered via machine plant_id)
        if ($tableName === 'parts' || $tableName === 'eam_parts') {
            return $query;
        }
        
        $plantIds = $this->getPlantIds();
        
        if (!empty($plantIds)) {
            $column = $table ? "$table.plant_id" : 'plant_id';
            
            // Check if column exists before applying scope
            $db = \Config\Database::connect();
            
            if ($tableName && $db->tableExists($tableName)) {
                $fields = $db->getFieldNames($tableName);
                if (in_array('plant_id', $fields)) {
                    $query->whereIn($column, $plantIds);
                }
            }
        }
        
        return $query;
    }
    
    protected function validatePlantAccess($plantId)
    {
        if (!is_numeric($plantId)) {
            return false;
        }
        
        $plantId = (int)$plantId;
        $allowedPlants = $this->getAllAccessiblePlantIds();
        
        $hasAccess = in_array($plantId, $allowedPlants, true);
        
        if (!$hasAccess) {
            $userData = $this->getUserData();
            log_message('warning', sprintf(
                'Plant access denied: User %s attempted to access plant %d',
                $userData['user_id'] ?? 'unknown',
                $plantId
            ));
        }
        
        return $hasAccess;
    }
}
