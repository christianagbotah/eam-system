<?php
namespace App\Models;
use CodeIgniter\Model;

class DowntimeLogModel extends Model {
    protected $table = 'downtime_logs';
    protected $primaryKey = 'id';
    protected $allowedFields = ['machine_id', 'start_time', 'end_time', 'duration_minutes', 'category', 'description', 'root_cause', 'logged_by'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $beforeInsert = ['calculateDuration'];
    protected $beforeUpdate = ['calculateDuration'];
    
    protected function calculateDuration(array $data) {
        if (isset($data['data']['start_time']) && isset($data['data']['end_time'])) {
            $start = strtotime($data['data']['start_time']);
            $end = strtotime($data['data']['end_time']);
            $data['data']['duration_minutes'] = round(($end - $start) / 60);
        }
        return $data;
    }
    
    public function getWithDetails($filters = []) {
        $builder = $this->select('downtime_logs.*, machines.machine_name, users.username as logged_by_name')
            ->join('machines', 'machines.id = downtime_logs.machine_id', 'left')
            ->join('users', 'users.id = downtime_logs.logged_by', 'left');
        
        if (!empty($filters['machine_id'])) $builder->where('downtime_logs.machine_id', $filters['machine_id']);
        if (!empty($filters['category'])) $builder->where('downtime_logs.category', $filters['category']);
        if (!empty($filters['date_from'])) $builder->where('DATE(downtime_logs.start_time) >=', $filters['date_from']);
        if (!empty($filters['date_to'])) $builder->where('DATE(downtime_logs.start_time) <=', $filters['date_to']);
        
        return $builder->orderBy('downtime_logs.start_time', 'DESC')->findAll();
    }
}
