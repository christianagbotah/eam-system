<?php

namespace App\Models;

use CodeIgniter\Model;

class EquipmentModel extends Model
{
    protected $table            = 'equipment';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = [
        'equipment_id', 'name', 'category_id', 'manufacturer', 'model', 
        'serial_number', 'purchase_date', 'installation_date', 'warranty_expiry',
        'location', 'department', 'status', 'criticality', 'specifications', 'expected_life_hours',
        'description', 'purchase_cost', 'model_file_path', 'model_thumbnail',
        'image_file_path', 'created_by'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    protected $validationRules = [
        'name'        => 'required|max_length[200]',
        'category_id' => 'required|is_natural_no_zero',
        'equipment_id' => 'permit_empty|max_length[50]|is_unique[equipment.equipment_id,id,{id}]'
    ];

    protected $validationMessages = [
        'name' => [
            'required' => 'Machine name is required',
            'max_length' => 'Machine name cannot exceed 200 characters'
        ],
        'category_id' => [
            'required' => 'Machine category is required',
            'is_natural_no_zero' => 'Please select a valid category'
        ]
    ];

    protected $beforeInsert = ['generateEquipmentId'];
    protected $beforeUpdate = [];

    protected function generateEquipmentId(array $data)
    {
        if (empty($data['data']['equipment_id'])) {
            $categoryModel = new \App\Models\EquipmentCategoryModel();
            $category = $categoryModel->find($data['data']['category_id']);
            
            if ($category) {
                $prefix = strtoupper(substr($category['name'], 0, 3));
                
                // Get next sequence number
                $lastEquipment = $this->select('equipment_id')
                    ->like('equipment_id', $prefix, 'after')
                    ->orderBy('equipment_id', 'DESC')
                    ->first();
                
                if ($lastEquipment) {
                    $lastNumber = intval(substr($lastEquipment['equipment_id'], -4));
                    $newNumber = $lastNumber + 1;
                } else {
                    $newNumber = 1;
                }
                
                $data['data']['equipment_id'] = $prefix . '-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
            }
        }
        
        return $data;
    }

    public function getEquipmentWithCategory($id = null)
    {
        $builder = $this->db->table('equipment e')
            ->select('e.*, ec.name as category_name, ec.color_code, ec.icon, u.first_name, u.last_name')
            ->join('equipment_categories ec', 'e.category_id = ec.id', 'left')
            ->join('users u', 'e.created_by = u.id', 'left');
        
        if ($id) {
            $builder->where('e.id', $id);
            return $builder->get()->getRowArray();
        }
        
        return $builder->get()->getResultArray();
    }

    public function getEquipmentWithAssemblies($id)
    {
        $equipment = $this->getEquipmentWithCategory($id);
        
        if ($equipment) {
            $assemblyModel = new \App\Models\AssemblyModel();
            $equipment['assemblies'] = $assemblyModel->getAssembliesByEquipment($id);
        }
        
        return $equipment;
    }

    public function getEquipmentStats()
    {
        $stats = [];
        
        // Total equipment
        $stats['total'] = $this->countAll();
        
        // By status
        $statusCounts = $this->select('status, COUNT(*) as count')
            ->groupBy('status')
            ->findAll();
        
        $stats['by_status'] = [];
        foreach ($statusCounts as $status) {
            $stats['by_status'][$status['status']] = $status['count'];
        }
        
        // By category
        $categoryCounts = $this->db->table('equipment e')
            ->select('ec.name as category, COUNT(*) as count')
            ->join('equipment_categories ec', 'e.category_id = ec.id')
            ->groupBy('ec.id')
            ->get()
            ->getResultArray();
        
        $stats['by_category'] = [];
        foreach ($categoryCounts as $category) {
            $stats['by_category'][$category['category']] = $category['count'];
        }
        
        return $stats;
    }

    public function searchEquipment($filters = [])
    {
        $builder = $this->db->table('equipment e')
            ->select('e.*, ec.name as category_name, ec.color_code, ec.icon, 
                     COUNT(DISTINCT a.id) as assembly_count,
                     COUNT(DISTINCT p.id) as parts_count')
            ->join('equipment_categories ec', 'e.category_id = ec.id', 'left')
            ->join('assemblies a', 'e.id = a.equipment_id', 'left')
            ->join('parts p', 'a.id = p.assembly_id', 'left');
        
        // Apply filters
        if (!empty($filters['category'])) {
            $builder->where('e.category_id', $filters['category']);
        }
        
        if (!empty($filters['status'])) {
            $builder->where('e.status', $filters['status']);
        }
        
        if (!empty($filters['location'])) {
            $builder->like('e.location', $filters['location']);
        }
        
        if (!empty($filters['search'])) {
            $builder->groupStart()
                ->like('e.name', $filters['search'])
                ->orLike('e.equipment_id', $filters['search'])
                ->orLike('e.manufacturer', $filters['search'])
                ->orLike('e.model', $filters['search'])
                ->groupEnd();
        }
        
        $builder->groupBy('e.id')
            ->orderBy('e.name', 'ASC');
        
        return $builder->get()->getResultArray();
    }

    public function getMachineById($machineId) {
        return $this->find($machineId);
    }

    
}