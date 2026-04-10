<?php

namespace App\Controllers\Api\V1;

use CodeIgniter\RESTful\ResourceController;
use App\Services\CompanySetupService;

class CompanyController extends ResourceController
{
    protected $format = 'json';
    protected $setupService;
    
    public function __construct()
    {
        $this->setupService = new CompanySetupService();
    }
    
    /**
     * Get company profile
     */
    public function getProfile()
    {
        try {
            $profile = $this->setupService->getCompanyProfile();
            
            return $this->respond([
                'success' => true,
                'data' => $profile
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch company profile: ' . $e->getMessage());
        }
    }
    
    /**
     * Update company profile
     */
    public function updateProfile()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $validation = \Config\Services::validation();
            $validation->setRules([
                'company_name' => 'required|min_length[3]|max_length[255]',
                'industry_type' => 'permit_empty|in_list[textile,fmcg,utilities,mining,manufacturing,food_beverage,pharmaceutical,automotive]',
                'currency' => 'permit_empty|exact_length[3]',
                'timezone' => 'permit_empty|max_length[50]',
                'shift_model' => 'permit_empty|in_list[2-shift,3-shift,24/7,day-only]',
                'maintenance_strategy' => 'permit_empty|in_list[reactive,preventive,predictive,hybrid]'
            ]);
            
            if (!$validation->run($data)) {
                return $this->failValidationErrors($validation->getErrors());
            }
            
            $db = \Config\Database::connect();
            
            // Update company_settings table
            $updateData = [
                'company_name' => $data['company_name'],
                'address' => $data['address'] ?? null,
                'phone' => $data['phone'] ?? null,
                'email' => $data['email'] ?? null,
                'website' => $data['website'] ?? null,
                'industry_type' => $data['industry_type'] ?? null,
                'union_environment' => $data['union_environment'] ?? false,
                'shift_model' => $data['shift_model'] ?? null,
                'maintenance_strategy' => $data['maintenance_strategy'] ?? null,
                'tax_id' => $data['tax_id'] ?? null,
                'registration_number' => $data['registration_number'] ?? null,
                'updated_at' => date('Y-m-d H:i:s')
            ];
            
            // Update existing record or insert new one
            $existing = $db->table('company_settings')->get()->getRow();
            
            if ($existing) {
                $db->table('company_settings')->where('id', $existing->id)->update($updateData);
            } else {
                $db->table('company_settings')->insert($updateData);
            }
            
            return $this->respond([
                'success' => true,
                'message' => 'Company profile updated successfully'
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to update company profile: ' . $e->getMessage());
        }
    }
    
    /**
     * Get setup wizard status
     */
    public function getSetupStatus()
    {
        try {
            $isConfigured = $this->setupService->isSystemConfigured();
            
            $db = \Config\Database::connect();
            
            // Check setup progress
            $progress = [
                'company_profile' => $db->table('company_settings')->where('company_name IS NOT NULL')->countAllResults() > 0,
                'facility_structure' => $db->table('facility')->countAllResults() > 0,
                'shift_definitions' => $db->table('shift_definitions')->countAllResults() > 0,
                'sla_templates' => $db->table('sla_templates')->countAllResults() > 0,
                'cost_centers' => $db->table('cost_centers')->countAllResults() > 0
            ];
            
            $completedSteps = array_sum($progress);
            $totalSteps = count($progress);
            $progressPercentage = ($completedSteps / $totalSteps) * 100;
            
            return $this->respond([
                'success' => true,
                'data' => [
                    'is_configured' => $isConfigured,
                    'progress' => $progress,
                    'progress_percentage' => $progressPercentage,
                    'completed_steps' => $completedSteps,
                    'total_steps' => $totalSteps
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to get setup status: ' . $e->getMessage());
        }
    }
    
    /**
     * Setup company profile (wizard step 1)
     */
    public function setupProfile()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $result = $this->setupService->setupCompanyProfile($data);
            
            if ($result['success']) {
                return $this->respond($result);
            } else {
                return $this->failValidationError($result['error']);
            }
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to setup company profile: ' . $e->getMessage());
        }
    }
    
    /**
     * Setup facility hierarchy (wizard step 2)
     */
    public function setupHierarchy()
    {
        try {
            $data = $this->request->getJSON(true);
            
            if (empty($data['facilities']) || !is_array($data['facilities'])) {
                return $this->failValidationError('Facilities array is required');
            }
            
            $result = $this->setupService->setupPlantStructure($data['facilities']);
            
            if ($result['success']) {
                return $this->respond($result);
            } else {
                return $this->failValidationError($result['error']);
            }
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to setup hierarchy: ' . $e->getMessage());
        }
    }
    
    /**
     * Setup shift definitions (wizard step 3)
     */
    public function setupShifts()
    {
        try {
            $data = $this->request->getJSON(true);
            
            if (empty($data['shift_model'])) {
                return $this->failValidationError('Shift model is required');
            }
            
            $result = $this->setupService->setupShiftDefinitions($data['shift_model']);
            
            if ($result['success']) {
                return $this->respond($result);
            } else {
                return $this->failValidationError($result['error']);
            }
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to setup shifts: ' . $e->getMessage());
        }
    }
    
    /**
     * Complete setup wizard
     */
    public function completeSetup()
    {
        try {
            $result = $this->setupService->completeSetup();
            
            if ($result['success']) {
                return $this->respond($result);
            } else {
                return $this->failValidationError($result['error']);
            }
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to complete setup: ' . $e->getMessage());
        }
    }
    
    /**
     * Get industry-specific configuration
     */
    public function getIndustryConfig()
    {
        try {
            $industryType = $this->request->getGet('industry');
            
            if (!$industryType) {
                return $this->failValidationError('Industry type is required');
            }
            
            // Get industry-specific downtime categories
            $db = \Config\Database::connect();
            
            $categories = $db->table('downtime_categories')
                            ->where('industry_type', $industryType)
                            ->orWhere('industry_type IS NULL') // Generic categories
                            ->get()
                            ->getResultArray();
            
            // Get industry-specific SLA templates
            $slaTemplates = $db->table('sla_templates')
                              ->where('is_default', 1)
                              ->get()
                              ->getResultArray();
            
            return $this->respond([
                'success' => true,
                'data' => [
                    'industry_type' => $industryType,
                    'downtime_categories' => $categories,
                    'sla_templates' => $slaTemplates
                ]
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to get industry config: ' . $e->getMessage());
        }
    }
    
    /**
     * Validate asset naming format
     */
    public function validateAssetNaming()
    {
        try {
            $data = $this->request->getJSON(true);
            
            if (empty($data['asset_name'])) {
                return $this->failValidationError('Asset name is required');
            }
            
            $result = $this->setupService->validateAssetName($data['asset_name']);
            
            return $this->respond([
                'success' => true,
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to validate asset naming: ' . $e->getMessage());
        }
    }
}