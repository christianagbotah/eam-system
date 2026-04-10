<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrder extends Model
{
    protected $table = 'work_orders';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'wo_number', 'title', 'description', 'asset_id', 'related_pm_id',
        'requestor_id', 'planner_id', 'assigned_user_id', 'assigned_group_id',
        'priority', 'status', 'type', 'estimated_hours', 'actual_hours',
        'planned_start', 'planned_end', 'actual_start', 'actual_end',
        'sla_hours', 'sla_started_at', 'sla_breached_at', 'version', 'total_cost'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'wo_number' => 'required|is_unique[work_orders.wo_number]',
        'title' => 'required|min_length[3]|max_length[255]',
        'asset_id' => 'required|integer',
        'type' => 'required|in_list[breakdown,corrective,inspection,lubrication,emergency,safety,improvement]',
        'priority' => 'required|in_list[low,medium,high,critical]',
        'status' => 'required|in_list[requested,approved,planned,assigned,in_progress,waiting_parts,on_hold,completed,closed,cancelled]'
    ];

    public function materials()
    {
        return $this->hasMany(WorkOrderMaterial::class, 'work_order_id');
    }

    public function attachments()
    {
        return $this->hasMany(WorkOrderAttachment::class, 'work_order_id');
    }

    public function logs()
    {
        return $this->hasMany(WorkOrderLog::class, 'work_order_id');
    }

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo('App\Models\User', 'assigned_user_id');
    }
}