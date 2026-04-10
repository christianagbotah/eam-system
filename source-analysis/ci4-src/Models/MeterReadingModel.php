<?php
namespace App\Models;
use CodeIgniter\Model;

class MeterReadingModel extends Model {
    protected $table = 'meter_readings';
    protected $primaryKey = 'id';
    protected $allowedFields = ['machine_id', 'reading', 'unit', 'date', 'recorded_by'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    
    public function getWithDetails($filters = []) {
        $builder = $this->select('meter_readings.*, machines.machine_name, users.username as recorded_by_name')
            ->join('machines', 'machines.id = meter_readings.machine_id', 'left')
            ->join('users', 'users.id = meter_readings.recorded_by', 'left');
        
        if (!empty($filters['machine_id'])) $builder->where('meter_readings.machine_id', $filters['machine_id']);
        if (!empty($filters['date_from'])) $builder->where('meter_readings.date >=', $filters['date_from']);
        if (!empty($filters['date_to'])) $builder->where('meter_readings.date <=', $filters['date_to']);
        
        return $builder->orderBy('meter_readings.date', 'DESC')->findAll();
    }
}
