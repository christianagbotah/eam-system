<?php

namespace App\Models;

use CodeIgniter\Model;

class AssetModel extends Model
{
    protected $table = 'assets';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    
    protected $allowedFields = [
        'name', 'asset_number', 'description', 'location', 'status',
        'facility_id', 'area_id', 'line_id', 'asset_code', 'criticality',
        'manufacturer', 'model', 'serial_number', 'purchase_date',
        'warranty_expiry', 'installation_date', 'commissioned_date'
    ];
    
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    protected $validationRules = [
        'name' => 'required|min_length[3]|max_length[255]',
        'asset_number' => 'required|is_unique[assets.asset_number,id,{id}]',
        'facility_id' => 'permit_empty|integer',
        'area_id' => 'permit_empty|integer',
        'line_id' => 'permit_empty|integer',
        'asset_code' => 'permit_empty|max_length[20]',
        'criticality' => 'permit_empty|in_list[low,medium,high,critical]'
    ];
    
    /**
     * Get assets with hierarchy information
     */
    public function getAssetsWithHierarchy($filters = [])
    {
        $builder = $this->db->table('assets a')
                           ->select('a.*, f.name as facility_name, fa.area_name, pl.line_name')
                           ->join('facility f', 'a.facility_id = f.id', 'left')
                           ->join('facility_areas fa', 'a.area_id = fa.id', 'left')
                           ->join('production_lines pl', 'a.line_id = pl.id', 'left');
        
        // Apply filters
        if (!empty($filters['facility_id'])) {
            $builder->where('a.facility_id', $filters['facility_id']);
        }
        
        if (!empty($filters['area_id'])) {
            $builder->where('a.area_id', $filters['area_id']);
        }
        
        if (!empty($filters['criticality'])) {
            $builder->where('a.criticality', $filters['criticality']);
        }
        
        if (!empty($filters['status'])) {
            $builder->where('a.status', $filters['status']);
        }
        
        return $builder->orderBy('a.name')->get()->getResultArray();
    }
    
    /**
     * Validate asset naming convention
     */
    public function validateAssetCode($assetCode, $facilityId, $areaId, $lineId)
    {
        // Get facility, area, line codes
        $facility = $this->db->table('facility')->where('id', $facilityId)->get()->getRow();
        $area = $this->db->table('facility_areas')->where('id', $areaId)->get()->getRow();
        $line = $this->db->table('production_lines')->where('id', $lineId)->get()->getRow();
        
        if (!$facility || !$area || !$line) {
            return ['valid' => false, 'error' => 'Invalid facility, area, or line selection'];
        }
        
        $expectedFormat = $facility->facility_code . '-' . $area->area_code . '-' . $line->line_code . '-';
        
        if (!str_starts_with($assetCode, $expectedFormat)) {
            return [
                'valid' => false,
                'error' => "Asset code must start with: {$expectedFormat}",
                'expected_format' => $expectedFormat . 'MACHINE'
            ];
        }
        
        return ['valid' => true];
    }
    
    /**
     * Get assets by criticality
     */
    public function getAssetsByCriticality($criticality = 'critical')
    {
        return $this->where('criticality', $criticality)
                   ->where('status', 'active')
                   ->findAll();
    }
    
    /**
     * Get facility hierarchy for asset
     */
    public function getAssetHierarchy($assetId)
    {
        return $this->db->table('assets a')
                       ->select('a.*, f.name as facility_name, f.facility_code, 
                                fa.area_name, fa.area_code, 
                                pl.line_name, pl.line_code')
                       ->join('facility f', 'a.facility_id = f.id', 'left')
                       ->join('facility_areas fa', 'a.area_id = fa.id', 'left')
                       ->join('production_lines pl', 'a.line_id = pl.id', 'left')
                       ->where('a.id', $assetId)
                       ->get()
                       ->getRow();
    }
}