<?php
namespace App\Models;

class ProductionSurveyModel extends PlantScopedModel {
    protected $table = 'production_surveys';
    protected $primaryKey = 'id';
    protected $allowedFields = ['plant_id', 'machine_id', 'operator_id', 'shift', 'date', 'target_quantity', 'actual_quantity', 'efficiency', 'downtime_minutes', 'downtime_reason', 'quality_issues', 'meter_reading', 'comments'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $beforeInsert = ['calculateEfficiency'];
    protected $beforeUpdate = ['calculateEfficiency'];
    
    protected function calculateEfficiency(array $data) {
        if (isset($data['data']['actual_quantity']) && isset($data['data']['target_quantity']) && $data['data']['target_quantity'] > 0) {
            $data['data']['efficiency'] = round(($data['data']['actual_quantity'] / $data['data']['target_quantity']) * 100, 2);
        }
        return $data;
    }
    
    public function getWithDetails($filters = []) {
        $builder = $this->select('production_surveys.*, machines.machine_name, users.username as operator_name')
            ->join('machines', 'machines.id = production_surveys.machine_id', 'left')
            ->join('users', 'users.id = production_surveys.operator_id', 'left');
        
        if (!empty($filters['machine_id'])) $builder->where('production_surveys.machine_id', $filters['machine_id']);
        if (!empty($filters['operator_id'])) $builder->where('production_surveys.operator_id', $filters['operator_id']);
        if (!empty($filters['shift'])) $builder->where('production_surveys.shift', $filters['shift']);
        if (!empty($filters['date_from'])) $builder->where('production_surveys.date >=', $filters['date_from']);
        if (!empty($filters['date_to'])) $builder->where('production_surveys.date <=', $filters['date_to']);
        
        return $builder->orderBy('production_surveys.date', 'DESC')->findAll();
    }
}
