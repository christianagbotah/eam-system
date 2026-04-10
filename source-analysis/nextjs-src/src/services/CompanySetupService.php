<?php

namespace App\Services;

/**
 * Company Setup Wizard Service
 * Handles first-run configuration for enterprise deployment
 */
class CompanySetupService
{
    protected $db;
    
    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }
    
    /**
     * Check if system is configured
     */
    public function isSystemConfigured(): bool
    {
        $config = $this->db->table('system_configuration')
                          ->where('config_key', 'setup_wizard_completed')
                          ->get()
                          ->getRow();
        
        return $config && $config->config_value === 'true';
    }
    
    /**
     * Initialize company profile
     */
    public function setupCompanyProfile(array $data): array
    {
        try {
            // Validate required fields
            $required = ['company_name', 'industry_type', 'currency', 'timezone', 'shift_model', 'maintenance_strategy'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    throw new \Exception("Field {$field} is required");
                }
            }
            
            // Insert/update company profile in existing company_settings table
            $this->db->table('company_settings')
                     ->where('id', 1)
                     ->update($profileData);
            
            // If no record exists, insert new one
            if ($this->db->affectedRows() === 0) {
                $this->db->table('company_settings')->insert($profileData);
            }
            
            // Update system configuration
            $this->updateSystemConfig('system_installed', 'true');
            
            return ['success' => true, 'message' => 'Company profile created successfully'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Setup plant hierarchy
     */
    public function setupPlantStructure(array $plants): array
    {
        try {
            $this->db->transStart();
            
            foreach ($plants as $plantData) {
                // Insert plant
                $plant = [
                    'plant_code' => $plantData['plant_code'],
                    'plant_name' => $plantData['plant_name'],
                    'location' => $plantData['location'] ?? null,
                    'manager_id' => $plantData['manager_id'] ?? null
                ];
                
                $this->db->table('plants')->insert($plant);
                $plantId = $this->db->insertID();
                
                // Insert areas
                if (!empty($plantData['areas'])) {
                    foreach ($plantData['areas'] as $areaData) {
                        $area = [
                            'plant_id' => $plantId,
                            'area_code' => $areaData['area_code'],
                            'area_name' => $areaData['area_name'],
                            'supervisor_id' => $areaData['supervisor_id'] ?? null
                        ];
                        
                        $this->db->table('plant_areas')->insert($area);
                        $areaId = $this->db->insertID();
                        
                        // Insert production lines
                        if (!empty($areaData['lines'])) {
                            foreach ($areaData['lines'] as $lineData) {
                                $line = [
                                    'area_id' => $areaId,
                                    'line_code' => $lineData['line_code'],
                                    'line_name' => $lineData['line_name'],
                                    'capacity_per_hour' => $lineData['capacity_per_hour'] ?? null,
                                    'operator_id' => $lineData['operator_id'] ?? null
                                ];
                                
                                $this->db->table('production_lines')->insert($line);
                            }
                        }
                    }
                }
            }
            
            $this->db->transComplete();
            
            if ($this->db->transStatus() === FALSE) {
                throw new \Exception('Failed to create plant structure');
            }
            
            return ['success' => true, 'message' => 'Plant structure created successfully'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Setup shift definitions based on shift model
     */
    public function setupShiftDefinitions(string $shiftModel): array
    {
        try {
            // Clear existing shifts
            $this->db->table('shift_definitions')->truncate();
            
            $shifts = [];
            
            switch ($shiftModel) {
                case '2-shift':
                    $shifts = [
                        ['shift_name' => 'Day Shift', 'start_time' => '06:00:00', 'end_time' => '18:00:00', 'is_overnight' => false],
                        ['shift_name' => 'Night Shift', 'start_time' => '18:00:00', 'end_time' => '06:00:00', 'is_overnight' => true]
                    ];
                    break;
                    
                case '3-shift':
                    $shifts = [
                        ['shift_name' => 'Day Shift', 'start_time' => '06:00:00', 'end_time' => '14:00:00', 'is_overnight' => false],
                        ['shift_name' => 'Evening Shift', 'start_time' => '14:00:00', 'end_time' => '22:00:00', 'is_overnight' => false],
                        ['shift_name' => 'Night Shift', 'start_time' => '22:00:00', 'end_time' => '06:00:00', 'is_overnight' => true]
                    ];
                    break;
                    
                case '24/7':
                    $shifts = [
                        ['shift_name' => 'Shift A', 'start_time' => '00:00:00', 'end_time' => '08:00:00', 'is_overnight' => false],
                        ['shift_name' => 'Shift B', 'start_time' => '08:00:00', 'end_time' => '16:00:00', 'is_overnight' => false],
                        ['shift_name' => 'Shift C', 'start_time' => '16:00:00', 'end_time' => '00:00:00', 'is_overnight' => true]
                    ];
                    break;
                    
                case 'day-only':
                    $shifts = [
                        ['shift_name' => 'Day Shift', 'start_time' => '08:00:00', 'end_time' => '17:00:00', 'is_overnight' => false]
                    ];
                    break;
            }
            
            foreach ($shifts as $shift) {
                $this->db->table('shift_definitions')->insert($shift);
            }
            
            return ['success' => true, 'message' => 'Shift definitions created successfully'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Setup industry-specific downtime categories
     */
    public function setupDowntimeCategories(string $industryType): array
    {
        try {
            $categories = $this->getIndustryDowntimeCategories($industryType);
            
            foreach ($categories as $category) {
                $this->db->table('downtime_categories')->insert($category);
            }
            
            return ['success' => true, 'message' => 'Downtime categories configured successfully'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Complete setup wizard
     */
    public function completeSetup(): array
    {
        try {
            // Mark setup as completed
            $this->updateSystemConfig('setup_wizard_completed', 'true');
            
            // Create initial admin user if not exists
            $adminExists = $this->db->table('users')
                                  ->where('role', 'admin')
                                  ->countAllResults() > 0;
            
            if (!$adminExists) {
                $adminData = [
                    'username' => 'admin',
                    'email' => 'admin@company.com',
                    'password_hash' => password_hash('admin123', PASSWORD_DEFAULT),
                    'role' => 'admin',
                    'is_active' => true
                ];
                
                $this->db->table('users')->insert($adminData);
            }
            
            // Log completion
            $this->logInstallationStep('setup_wizard_completed', 'completed', 'Setup wizard completed successfully');
            
            return ['success' => true, 'message' => 'Setup completed successfully'];
            
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    /**
     * Get company profile from existing company_settings table
     */
    public function getCompanyProfile(): ?array
    {
        $profile = $this->db->table('company_settings')
                           ->get()
                           ->getRowArray();
        
        return $profile;
    }
    
    /**
     * Validate asset naming format
     */
    public function validateAssetName(string $assetName): array
    {
        $format = $this->getSystemConfig('asset_naming_format');
        $pattern = str_replace(['PLANT', 'AREA', 'LINE', 'MACHINE'], ['[A-Z0-9]+', '[A-Z0-9]+', '[A-Z0-9]+', '[A-Z0-9]+'], $format);
        $pattern = '/^' . str_replace('-', '-', $pattern) . '$/';
        
        if (preg_match($pattern, $assetName)) {
            return ['valid' => true];
        }
        
        return [
            'valid' => false,
            'error' => "Asset name must follow format: {$format}",
            'example' => 'PLT1-PROD-LINE1-MACH001'
        ];
    }
    
    /**
     * Update system configuration
     */
    private function updateSystemConfig(string $key, string $value): void
    {
        $this->db->table('system_configuration')
                 ->where('config_key', $key)
                 ->update(['config_value' => $value]);
    }
    
    /**
     * Get system configuration value
     */
    private function getSystemConfig(string $key): ?string
    {
        $config = $this->db->table('system_configuration')
                          ->where('config_key', $key)
                          ->get()
                          ->getRow();
        
        return $config ? $config->config_value : null;
    }
    
    /**
     * Get industry-specific downtime categories
     */
    private function getIndustryDowntimeCategories(string $industryType): array
    {
        $baseCategories = [
            ['category_code' => 'MECH_FAIL', 'category_name' => 'Mechanical Failure', 'impact_level' => 'high'],
            ['category_code' => 'ELEC_FAIL', 'category_name' => 'Electrical Failure', 'impact_level' => 'high'],
            ['category_code' => 'PLANNED_MAINT', 'category_name' => 'Planned Maintenance', 'impact_level' => 'medium', 'is_planned' => true],
            ['category_code' => 'CHANGEOVER', 'category_name' => 'Product Changeover', 'impact_level' => 'low', 'is_planned' => true],
            ['category_code' => 'QUALITY_ISSUE', 'category_name' => 'Quality Issue', 'impact_level' => 'medium'],
            ['category_code' => 'MATERIAL_SHORT', 'category_name' => 'Material Shortage', 'impact_level' => 'high'],
            ['category_code' => 'OPERATOR_ERROR', 'category_name' => 'Operator Error', 'impact_level' => 'medium']
        ];
        
        // Add industry-specific categories
        switch ($industryType) {
            case 'textile':
                $baseCategories[] = ['category_code' => 'YARN_BREAK', 'category_name' => 'Yarn Breakage', 'impact_level' => 'medium'];
                $baseCategories[] = ['category_code' => 'LOOM_JAM', 'category_name' => 'Loom Jam', 'impact_level' => 'medium'];
                break;
                
            case 'fmcg':
                $baseCategories[] = ['category_code' => 'PACKAGING_JAM', 'category_name' => 'Packaging Jam', 'impact_level' => 'medium'];
                $baseCategories[] = ['category_code' => 'LABEL_ISSUE', 'category_name' => 'Labeling Issue', 'impact_level' => 'low'];
                break;
                
            case 'utilities':
                $baseCategories[] = ['category_code' => 'POWER_OUTAGE', 'category_name' => 'Power Outage', 'impact_level' => 'critical'];
                $baseCategories[] = ['category_code' => 'GRID_FAULT', 'category_name' => 'Grid Fault', 'impact_level' => 'critical'];
                break;
        }
        
        // Add industry_type to all categories
        foreach ($baseCategories as &$category) {
            $category['industry_type'] = $industryType;
        }
        
        return $baseCategories;
    }
    
    /**
     * Log installation step
     */
    private function logInstallationStep(string $stepName, string $status, string $details = null): void
    {
        $data = [
            'id' => $this->generateUuid(),
            'step_name' => $stepName,
            'step_status' => $status,
            'details' => $details ? json_encode(['message' => $details]) : null
        ];
        
        if ($status === 'completed' || $status === 'failed') {
            $data['end_time'] = date('Y-m-d H:i:s');
        }
        
        $this->db->table('installation_log')->insert($data);
    }
    
    /**
     * Generate UUID
     */
    private function generateUuid(): string
    {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
}