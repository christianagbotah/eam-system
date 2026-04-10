<?php

namespace App\Controllers\Api\V1;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\PlantScopeTrait;

/**
 * Base Resource Controller with Plant Scope Support
 * Use this for controllers that need ResourceController features + plant filtering
 */
class BaseResourceController extends ResourceController
{
    use PlantScopeTrait;
    
    protected $format = 'json';
    
    /**
     * Apply plant filtering to a model query builder
     * 
     * @param mixed $builder Query builder or model instance
     * @return mixed Modified builder
     */
    protected function applyPlantFilter($builder)
    {
        $plantIds = $this->getPlantIds();
        
        if (!empty($plantIds)) {
            $builder->whereIn('plant_id', $plantIds);
        }
        
        return $builder;
    }
    
    /**
     * Get user data from JWT
     * 
     * @return object|null
     */
    protected function getUserData()
    {
        $userData = $GLOBALS['jwt_user_data'] ?? null;
        
        if (!$userData && session()->has('user_data')) {
            $userData = (object)session()->get('user_data');
        }
        
        return $userData;
    }
    
    /**
     * Check if user has permission
     * 
     * @param string $permission
     * @return bool
     */
    protected function checkPermission($permission)
    {
        $userData = $this->getUserData();
        
        if (!$userData) {
            return false;
        }
        
        $userRole = $userData->role ?? null;
        
        // Admin has all permissions
        if ($userRole === 'admin') {
            return true;
        }
        
        // TODO: Implement proper RBAC from database
        return true;
    }
    
    /**
     * Validate plant access in request data
     * 
     * @param array $data
     * @return array Modified data with plant_id
     */
    protected function validatePlantInRequest($data)
    {
        if (isset($data['plant_id'])) {
            if (!$this->validatePlantAccess($data['plant_id'])) {
                return $this->failForbidden('Access denied to specified plant');
            }
        } else {
            // Auto-inject default plant if not provided
            $data['plant_id'] = $this->getPlantId();
        }
        
        return $data;
    }
}
