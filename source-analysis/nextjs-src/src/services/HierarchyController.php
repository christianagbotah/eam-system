<?php

namespace App\Controllers\Api\V1;

use CodeIgniter\RESTful\ResourceController;

class HierarchyController extends ResourceController
{
    protected $format = 'json';
    
    /**
     * Get facility hierarchy
     */
    public function getFacilities()
    {
        try {
            $db = \Config\Database::connect();
            
            $facilities = $db->table('facility f')
                            ->select('f.*, COUNT(a.id) as asset_count')
                            ->join('assets a', 'f.id = a.facility_id', 'left')
                            ->where('f.is_active', 1)
                            ->groupBy('f.id')
                            ->get()
                            ->getResultArray();
            
            return $this->respond([
                'success' => true,
                'data' => $facilities
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch facilities: ' . $e->getMessage());
        }
    }
    
    /**
     * Get areas for a facility
     */
    public function getFacilityAreas($facilityId = null)
    {
        try {
            if (!$facilityId) {
                return $this->failValidationError('Facility ID is required');
            }
            
            $db = \Config\Database::connect();
            
            $areas = $db->table('facility_areas fa')
                       ->select('fa.*, COUNT(a.id) as asset_count')
                       ->join('assets a', 'fa.id = a.area_id', 'left')
                       ->where('fa.facility_id', $facilityId)
                       ->where('fa.is_active', 1)
                       ->groupBy('fa.id')
                       ->get()
                       ->getResultArray();
            
            return $this->respond([
                'success' => true,
                'data' => $areas
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch areas: ' . $e->getMessage());
        }
    }
    
    /**
     * Get production lines for an area
     */
    public function getAreaLines($areaId = null)
    {
        try {
            if (!$areaId) {
                return $this->failValidationError('Area ID is required');
            }
            
            $db = \Config\Database::connect();
            
            $lines = $db->table('production_lines pl')
                       ->select('pl.*, COUNT(a.id) as asset_count')
                       ->join('assets a', 'pl.id = a.line_id', 'left')
                       ->where('pl.area_id', $areaId)
                       ->where('pl.is_active', 1)
                       ->groupBy('pl.id')
                       ->get()
                       ->getResultArray();
            
            return $this->respond([
                'success' => true,
                'data' => $lines
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch production lines: ' . $e->getMessage());
        }
    }
    
    /**
     * Create facility area
     */
    public function createArea()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $validation = \Config\Services::validation();
            $validation->setRules([
                'facility_id' => 'required|integer',
                'area_code' => 'required|max_length[10]',
                'area_name' => 'required|max_length[255]',
                'supervisor_id' => 'permit_empty|integer'
            ]);
            
            if (!$validation->run($data)) {
                return $this->failValidationErrors($validation->getErrors());
            }
            
            $db = \Config\Database::connect();
            
            // Check for duplicate area code in facility
            $existing = $db->table('facility_areas')
                          ->where('facility_id', $data['facility_id'])
                          ->where('area_code', $data['area_code'])
                          ->get()
                          ->getRow();
            
            if ($existing) {
                return $this->failValidationError('Area code already exists in this facility');
            }
            
            $areaData = [
                'facility_id' => $data['facility_id'],
                'area_code' => $data['area_code'],
                'area_name' => $data['area_name'],
                'supervisor_id' => $data['supervisor_id'] ?? null
            ];
            
            $db->table('facility_areas')->insert($areaData);
            $areaId = $db->insertID();
            
            return $this->respondCreated([
                'success' => true,
                'message' => 'Area created successfully',
                'area_id' => $areaId
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to create area: ' . $e->getMessage());
        }
    }
    
    /**
     * Create production line
     */
    public function createLine()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $validation = \Config\Services::validation();
            $validation->setRules([
                'area_id' => 'required|integer',
                'line_code' => 'required|max_length[10]',
                'line_name' => 'required|max_length[255]',
                'capacity_per_hour' => 'permit_empty|decimal',
                'operator_id' => 'permit_empty|integer'
            ]);
            
            if (!$validation->run($data)) {
                return $this->failValidationErrors($validation->getErrors());
            }
            
            $db = \Config\Database::connect();
            
            // Check for duplicate line code in area
            $existing = $db->table('production_lines')
                          ->where('area_id', $data['area_id'])
                          ->where('line_code', $data['line_code'])
                          ->get()
                          ->getRow();
            
            if ($existing) {
                return $this->failValidationError('Line code already exists in this area');
            }
            
            $lineData = [
                'area_id' => $data['area_id'],
                'line_code' => $data['line_code'],
                'line_name' => $data['line_name'],
                'capacity_per_hour' => $data['capacity_per_hour'] ?? null,
                'operator_id' => $data['operator_id'] ?? null
            ];
            
            $db->table('production_lines')->insert($lineData);
            $lineId = $db->insertID();
            
            return $this->respondCreated([
                'success' => true,
                'message' => 'Production line created successfully',
                'line_id' => $lineId
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to create production line: ' . $e->getMessage());
        }
    }
    
    /**
     * Get complete hierarchy tree
     */
    public function getHierarchyTree()
    {
        try {
            $db = \Config\Database::connect();
            
            // Get facilities with areas and lines
            $facilities = $db->table('facility')
                            ->where('is_active', 1)
                            ->orderBy('name')
                            ->get()
                            ->getResultArray();
            
            foreach ($facilities as &$facility) {
                // Get areas for this facility
                $areas = $db->table('facility_areas')
                           ->where('facility_id', $facility['id'])
                           ->where('is_active', 1)
                           ->orderBy('area_name')
                           ->get()
                           ->getResultArray();
                
                foreach ($areas as &$area) {
                    // Get lines for this area
                    $lines = $db->table('production_lines')
                               ->where('area_id', $area['id'])
                               ->where('is_active', 1)
                               ->orderBy('line_name')
                               ->get()
                               ->getResultArray();
                    
                    $area['lines'] = $lines;
                }
                
                $facility['areas'] = $areas;
            }
            
            return $this->respond([
                'success' => true,
                'data' => $facilities
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to fetch hierarchy tree: ' . $e->getMessage());
        }
    }
    
    /**
     * Validate asset naming format
     */
    public function validateAssetName()
    {
        try {
            $data = $this->request->getJSON(true);
            
            if (empty($data['asset_code']) || empty($data['facility_id']) || 
                empty($data['area_id']) || empty($data['line_id'])) {
                return $this->failValidationError('Asset code, facility, area, and line are required');
            }
            
            $db = \Config\Database::connect();
            
            // Get codes for validation
            $facility = $db->table('facility')->where('id', $data['facility_id'])->get()->getRow();
            $area = $db->table('facility_areas')->where('id', $data['area_id'])->get()->getRow();
            $line = $db->table('production_lines')->where('id', $data['line_id'])->get()->getRow();
            
            if (!$facility || !$area || !$line) {
                return $this->failValidationError('Invalid facility, area, or line selection');
            }
            
            $expectedFormat = $facility->facility_code . '-' . $area->area_code . '-' . $line->line_code . '-';
            
            if (!str_starts_with($data['asset_code'], $expectedFormat)) {
                return $this->respond([
                    'valid' => false,
                    'error' => "Asset code must start with: {$expectedFormat}",
                    'expected_format' => $expectedFormat . 'MACHINE',
                    'example' => $expectedFormat . 'MACH001'
                ]);
            }
            
            return $this->respond([
                'valid' => true,
                'message' => 'Asset code format is valid'
            ]);
            
        } catch (\Exception $e) {
            return $this->failServerError('Failed to validate asset name: ' . $e->getMessage());
        }
    }
}