<?php

namespace App\Models;

use CodeIgniter\Model;

class Technician extends Model
{
    protected $table = 'users';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'username', 'email', 'first_name', 'last_name', 'role', 'status'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'username' => 'required|is_unique[users.username]|max_length[50]',
        'email' => 'required|valid_email|is_unique[users.email]',
        'role' => 'in_list[admin,manager,supervisor,technician,operator,planner,shop_attendant]'
    ];

    public function workOrders()
    {
        return $this->hasMany(WorkOrder::class, 'assigned_user_id');
    }

    public function getAvailableHours(string $date): float
    {
        // Calculate available hours for a technician on a given date
        $assignedHours = $this->db->table('work_orders')
            ->selectSum('estimated_hours')
            ->where('assigned_user_id', $this->id)
            ->where('DATE(planned_start)', $date)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->get()->getRow()->estimated_hours ?? 0;

        return 8 - $assignedHours; // Assuming 8-hour workday
    }
}