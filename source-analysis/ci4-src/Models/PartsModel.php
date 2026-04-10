<?php

namespace App\Models;

use CodeIgniter\Model;

class PartsModel extends Model
{
    protected $table            = 'parts';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'part_number', 'assembly_id', 'name', 'category', 'description',
        'manufacturer', 'supplier', 'material', 'specifications',
        'position_x', 'position_y', 'position_z', 'rotation_x', 'rotation_y', 'rotation_z',
        'scale_x', 'scale_y', 'scale_z', 'color', 'criticality',
        'unit_cost', 'lead_time_days', 'stock_quantity', 'min_stock_level', 'max_stock_level',
        'status', 'installation_date', 'last_replaced', 'expected_life_hours',
        'operating_hours', 'model_geometry', 'image_file_path', 'labels'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $validationRules = [
        'name'        => 'required|max_length[200]',
        'assembly_id' => 'required|is_natural_no_zero',
        'part_number' => 'permit_empty|max_length[50]|is_unique[parts.part_number,id,{id}]'
    ];

    protected $beforeInsert = ['generatePartNumber'];

    protected function generatePartNumber(array $data)
    {
        if (empty($data['data']['part_number'])) {
            $assemblyModel = new \App\Models\AssemblyModel();
            $assembly = $assemblyModel->find($data['data']['assembly_id']);
            
            if ($assembly) {
                $prefix = $assembly['assembly_id'] . '-P';
                
                // Get next sequence number
                $lastPart = $this->select('part_number')
                    ->where('assembly_id', $data['data']['assembly_id'])
                    ->like('part_number', $prefix, 'after')
                    ->orderBy('part_number', 'DESC')
                    ->first();
                
                if ($lastPart) {
                    $lastNumber = intval(substr($lastPart['part_number'], -3));
                    $newNumber = $lastNumber + 1;
                } else {
                    $newNumber = 1;
                }
                
                $data['data']['part_number'] = $prefix . '-' . str_pad($newNumber, 3, '0', STR_PAD_LEFT);
            }
        }
        
        return $data;
    }

    public function getPartsByAssembly($assemblyId)
    {
        return $this->where('assembly_id', $assemblyId)
            ->orderBy('name', 'ASC')
            ->findAll();
    }

    public function getPartsWithAssemblyInfo($assemblyId = null, $filters = [])
    {
        $builder = $this->db->table('parts p')
            ->select('p.*, a.name as assembly_name, a.assembly_id, 
                     e.name as equipment_name, e.equipment_id')
            ->join('assemblies a', 'p.assembly_id = a.id', 'left')
            ->join('equipment e', 'a.equipment_id = e.id', 'left');
        
        if ($assemblyId) {
            $builder->where('p.assembly_id', $assemblyId);
        }
        
        // Apply filters
        if (!empty($filters['category'])) {
            $builder->where('p.category', $filters['category']);
        }
        
        if (!empty($filters['status'])) {
            $builder->where('p.status', $filters['status']);
        }
        
        if (!empty($filters['criticality'])) {
            $builder->where('p.criticality', $filters['criticality']);
        }
        
        if (!empty($filters['low_stock'])) {
            $builder->where('p.stock_quantity <=', 'p.min_stock_level', false);
        }
        
        if (!empty($filters['search'])) {
            $builder->groupStart()
                ->like('p.name', $filters['search'])
                ->orLike('p.part_number', $filters['search'])
                ->orLike('p.manufacturer', $filters['search'])
                ->groupEnd();
        }
        
        $builder->orderBy('p.name', 'ASC');
        
        return $builder->get()->getResultArray();
    }

    public function getParById($id)
    {
        $part = $this->find($id);
        
        return $part;
    }

    public function updateStock($id, $quantityChange, $operation = 'add')
    {
        $part = $this->find($id);
        
        if ($part) {
            if ($operation == 'add') {
                $newQuantity = $part['stock_quantity'] + $quantityChange;
            } else {
                $newQuantity = $part['stock_quantity'] - $quantityChange;
            }
            
            $newQuantity = max(0, $newQuantity); // Ensure non-negative
            
            return $this->update($id, ['stock_quantity' => $newQuantity]);
        }
        
        return false;
    }

    public function getLowStockParts()
    {
        return $this->db->table('parts p')
            ->select('p.*, a.name as assembly_name, e.name as equipment_name')
            ->join('assemblies a', 'p.assembly_id = a.id', 'left')
            ->join('equipment e', 'a.equipment_id = e.id', 'left')
            ->where('p.stock_quantity <=', 'p.min_stock_level', false)
            ->orderBy('p.criticality', 'DESC')
            ->orderBy('p.name', 'ASC')
            ->get()
            ->getResultArray();
    }

    public function getPartsCategories()
    {
        return $this->select('category')
            ->where('category IS NOT NULL')
            ->groupBy('category')
            ->orderBy('category', 'ASC')
            ->findColumn('category');
    }

    public function updatePosition($id, $positionData)
    {
        $allowedFields = [
            'position_x', 'position_y', 'position_z',
            'rotation_x', 'rotation_y', 'rotation_z',
            'scale_x', 'scale_y', 'scale_z'
        ];
        
        $updateData = [];
        foreach ($allowedFields as $field) {
            if (isset($positionData[$field])) {
                $updateData[$field] = $positionData[$field];
            }
        }
        
        return $this->update($id, $updateData);
    }

    public function getPartCountsByAssemblyIds($assemblyIds = array()) {
       $data = $this->whereIn('assembly_id', $assemblyIds)->findAll();

       return count($data);
    }

    public function getPartsByAssemblyIds($assemblyIds = array()) {
       $data = $this->whereIn('assembly_id', $assemblyIds)->findAll();

       return $data;
    }

    public function getPartsByAssemblyIdByPartId($partId) {
       $row = $this->find($partId);

       return $row['assembly_id'];
    }
}