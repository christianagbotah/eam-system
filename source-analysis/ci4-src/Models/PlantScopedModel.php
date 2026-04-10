<?php
namespace App\Models;

use CodeIgniter\Model;

class PlantScopedModel extends Model
{
    protected $usePlantScope = true;
    
    protected function applyPlantScope($builder)
    {
        if (!$this->usePlantScope) {
            return $builder;
        }
        
        $session = session();
        $allowedPlants = $session->get('allowed_plant_ids');
        
        if ($allowedPlants && $this->hasColumn('plant_id')) {
            $builder->whereIn($this->table . '.plant_id', $allowedPlants);
        }
        
        return $builder;
    }
    
    public function find($id = null)
    {
        $builder = $this->builder();
        $this->applyPlantScope($builder);
        
        if ($id === null) {
            return $builder->get()->getResultArray();
        }
        
        return $builder->where($this->primaryKey, $id)->get()->getRowArray();
    }
    
    public function findAll(?int $limit = null, int $offset = 0)
    {
        $builder = $this->builder();
        $this->applyPlantScope($builder);
        
        if ($limit !== null) {
            $builder->limit($limit, $offset);
        }
        
        return $builder->get()->getResultArray();
    }
    
    public function insert($data = null, bool $returnID = true)
    {
        // Auto-inject plant_id if not provided
        if (is_array($data) && $this->hasColumn('plant_id') && !isset($data['plant_id'])) {
            $data['plant_id'] = session()->get('default_plant_id');
        }
        
        return parent::insert($data, $returnID);
    }
    
    public function update($id = null, $data = null): bool
    {
        // Verify plant access before update
        if ($this->hasColumn('plant_id')) {
            $existing = $this->find($id);
            if (!$existing) {
                return false; // Plant scope prevents access
            }
        }
        
        return parent::update($id, $data);
    }
    
    public function delete($id = null, bool $purge = false)
    {
        // Verify plant access before delete
        if ($this->hasColumn('plant_id')) {
            $existing = $this->find($id);
            if (!$existing) {
                return false; // Plant scope prevents access
            }
        }
        
        return parent::delete($id, $purge);
    }
    
    protected function hasColumn($column)
    {
        $fields = $this->db->getFieldNames($this->table);
        return in_array($column, $fields);
    }
    
    public function withoutPlantScope()
    {
        $this->usePlantScope = false;
        return $this;
    }
}
