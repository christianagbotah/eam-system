<?php

namespace App\Controllers\Api\V1;

use CodeIgniter\RESTful\ResourceController;
use App\Traits\PlantScopeTrait;

/**
 * ScopedResourceController - ResourceController with plant isolation
 * 
 * This controller adds plant scope filtering to all endpoints,
 * ensuring data isolation between plants in multi-tenant deployments.
 * 
 * Usage: Extend this controller instead of ResourceController
 *        when you need automatic plant filtering on all operations.
 */
class ScopedResourceController extends ResourceController
{
    use PlantScopeTrait;
    
    protected $format = 'json';
    
    /**
     * Constructor - Initialize plant context
     */
    public function __construct()
    {
        parent::__construct();
        $this->initPlantContext();
    }
    
    /**
     * Initialize plant context from request
     * Sets up the plant ID for the current request
     */
    protected function initPlantContext()
    {
        // The PlantScopeTrait methods handle this automatically
        // This is called to ensure context is loaded early
        try {
            $this->getPlantId();
        } catch (\Exception $e) {
            log_message('warning', 'Plant context init failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Apply plant scope to a query builder
     * 
     * @param object $query Query builder instance
     * @param string|null $table Table alias if different from default
     * @return object Query builder with plant filter applied
     */
    protected function applyScope($query, $table = null)
    {
        return $this->applyPlantScope($query, $table);
    }
    
    /**
     * Get current plant ID
     * 
     * @return int|null Current plant ID or null
     */
    protected function getCurrentPlantId()
    {
        return $this->getPlantId();
    }
    
    /**
     * Get all accessible plant IDs for current user
     * 
     * @return array List of accessible plant IDs
     */
    protected function getAccessiblePlantIds()
    {
        return $this->getAllAccessiblePlantIds();
    }
    
    /**
     * Validate access to a specific plant
     * 
     * @param int $plantId Plant ID to validate
     * @return bool True if access is allowed
     */
    protected function validatePlantAccess($plantId)
    {
        return $this->validatePlantAccess($plantId);
    }
    
    /**
     * Standard success response
     * 
     * @param mixed $data Response data
     * @param string $message Success message
     * @param int $code HTTP status code
     * @return \CodeIgniter\HTTP\Response
     */
    protected function successResponse($data = null, $message = 'Success', $code = 200)
    {
        return $this->respond([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $code);
    }
    
    /**
     * Standard error response
     * 
     * @param string $message Error message
     * @param int $code HTTP status code
     * @return \CodeIgniter\HTTP\Response
     */
    protected function errorResponse($message = 'Error', $code = 400)
    {
        return $this->respond([
            'success' => false,
            'message' => $message,
            'data' => null
        ], $code);
    }
}
