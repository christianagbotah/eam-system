<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class SetupController extends ResourceController
{
    protected $format = 'json';

    public function checkSetup()
    {
        $db = \Config\Database::connect();
        $query = $db->query("SELECT is_configured FROM company_settings LIMIT 1");
        $result = $query->getRowArray();
        
        return $this->respond([
            'status' => 'success',
            'is_configured' => $result ? (bool)$result['is_configured'] : false
        ]);
    }

    public function initializeCompany()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        
        // Update company settings
        $companyData = [
            'company_name' => $data['company_name'],
            'industry_type' => $data['industry_type'],
            'union_environment' => $data['union_environment'] ?? false,
            'shift_model' => $data['shift_model'] ?? '3-shift',
            'maintenance_strategy' => $data['maintenance_strategy'] ?? 'preventive',
            'tax_id' => $data['tax_id'] ?? null,
            'registration_number' => $data['registration_number'] ?? null,
            'is_configured' => true
        ];
        
        $db->table('company_settings')->where('id', 1)->update($companyData);
        
        // Create default facility
        $facilityData = [
            'name' => $data['facility_name'] ?? $data['company_name'] . ' Main Plant',
            'facility_code' => $data['facility_code'] ?? 'MAIN',
            'location' => $data['location'] ?? '',
            'manager_id' => 1,
            'is_active' => true
        ];
        
        $facilityId = $db->table('facility')->insert($facilityData) ? $db->insertID() : 1;
        
        // Create default areas
        $areas = $data['areas'] ?? [
            ['area_code' => 'PROD', 'area_name' => 'Production'],
            ['area_code' => 'MAINT', 'area_name' => 'Maintenance'],
            ['area_code' => 'UTIL', 'area_name' => 'Utilities']
        ];
        
        foreach ($areas as $area) {
            $db->table('facility_areas')->insert([
                'facility_id' => $facilityId,
                'area_code' => $area['area_code'],
                'area_name' => $area['area_name'],
                'is_active' => true
            ]);
        }
        
        // Create current financial period
        $currentYear = date('Y');
        $currentMonth = date('n');
        
        $db->table('financial_periods')->insert([
            'period_year' => $currentYear,
            'period_month' => $currentMonth,
            'period_name' => date('M Y'),
            'start_date' => date('Y-m-01'),
            'end_date' => date('Y-m-t'),
            'status' => 'open'
        ]);
        
        return $this->respond([
            'status' => 'success',
            'message' => 'Company initialized successfully',
            'facility_id' => $facilityId
        ]);
    }

    public function getIndustryDefaults($industry)
    {
        $defaults = [
            'textile' => [
                'shift_model' => '3-shift',
                'maintenance_strategy' => 'preventive',
                'union_environment' => true,
                'areas' => [
                    ['area_code' => 'SPIN', 'area_name' => 'Spinning'],
                    ['area_code' => 'WEAV', 'area_name' => 'Weaving'],
                    ['area_code' => 'FINI', 'area_name' => 'Finishing']
                ]
            ],
            'manufacturing' => [
                'shift_model' => '2-shift',
                'maintenance_strategy' => 'hybrid',
                'union_environment' => false,
                'areas' => [
                    ['area_code' => 'ASSY', 'area_name' => 'Assembly'],
                    ['area_code' => 'MACH', 'area_name' => 'Machining'],
                    ['area_code' => 'QC', 'area_name' => 'Quality Control']
                ]
            ]
        ];
        
        return $this->respond([
            'status' => 'success',
            'defaults' => $defaults[$industry] ?? $defaults['manufacturing']
        ]);
    }
}