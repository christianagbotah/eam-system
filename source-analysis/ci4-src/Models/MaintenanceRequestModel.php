<?php

namespace App\Models;

use App\Models\PlantScopedModel;

class MaintenanceRequestModel extends PlantScopedModel
{
    protected $table = 'maintenance_requests';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'plant_id',
        'request_number',
        'title',
        'description',
        'priority',
        'machine_down_status',
        'status',
        'workflow_status',
        'asset_id',
        'assembly_id',
        'part_id',
        'location',
        'requested_by',
        'assigned_to',
        'requested_date',
        'completed_date',
        'notes',
        'supervisor_id',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'assigned_planner_id',
        'planner_type',
        'work_order_id',
        'rejection_reason',
        'department_id',
        'assigned_technician_id',
        'item_type',
        'asset_name',
        'satisfactory_checked_by',
        'satisfactory_checked_at',
        'work_started_at',
        'work_started_by',
        'completed_by',
        'completed_at',
        'closed_by',
        'closed_at',
        'sla_due_date',
        'sla_breach_flag',
        'sla_response_minutes',
        'requires_safety_approval',
        'requires_shutdown',
        'estimated_cost',
        'cost_approval_required',
        'triaged_by',
        'triaged_at',
        'approval_date',
        'approval_notes',
        'converted_by',
        'converted_at'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'title' => 'required|max_length[255]',
        'description' => 'permit_empty',
        'priority' => 'permit_empty|in_list[low,medium,high,urgent]',
        'status' => 'permit_empty|in_list[pending,in_progress,completed,cancelled,approved,rejected,converted]',
        'asset_id' => 'permit_empty|integer',
        'assembly_id' => 'permit_empty|integer',
        'part_id' => 'permit_empty|integer',
        'location' => 'permit_empty|max_length[255]'
    ];

    protected $validationMessages = [
        'title' => [
            'required' => 'Title is required',
            'max_length' => 'Title cannot exceed 255 characters'
        ],
        'priority' => [
            'required' => 'Priority is required',
            'in_list' => 'Priority must be one of: low, medium, high, urgent'
        ]
    ];

    protected $skipValidation = false;
    protected $cleanValidationRules = true;

    protected $allowCallbacks = true;
    protected $beforeInsert = ['setDefaults'];
    protected $beforeUpdate = [];

    protected function setDefaults(array $data)
    {
        if (!isset($data['data']['priority'])) {
            $data['data']['priority'] = 'medium';
        }
        
        if (!isset($data['data']['status'])) {
            $data['data']['status'] = 'pending';
        }
        
        if (!isset($data['data']['workflow_status'])) {
            $data['data']['workflow_status'] = 'pending';
        }
        
        if (!isset($data['data']['requested_date'])) {
            $data['data']['requested_date'] = date('Y-m-d H:i:s');
        }

        if (!isset($data['data']['request_number'])) {
            $data['data']['request_number'] = $this->generateRequestNumber();
        }

        return $data;
    }

    protected function generateRequestNumber()
    {
        $prefix = 'MR';
        $year = date('Y');
        $month = date('m');
        
        $lastRequest = $this->select('request_number')
                           ->like('request_number', $prefix . $year . $month, 'after')
                           ->orderBy('id', 'DESC')
                           ->first();
        
        if ($lastRequest && !empty($lastRequest['request_number'])) {
            $lastNumber = (int)substr($lastRequest['request_number'], -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . $year . $month . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get maintenance requests with related asset, assembly, and part information
     * If asset_id is null, uses asset_name directly from the request
     */
    public function getRequestsWithDetails($limit = null, $offset = null)
    {
        $builder = $this->db->table($this->table . ' mr');
        $builder->select('
            mr.*,
            COALESCE(au.asset_name, mr.asset_name) as machine_name,
            au.asset_code as machine_code,`n            au.asset_type,
            a.assembly_name,
            a.assembly_code,
            p.part_name,
            p.part_number,
            u1.name as requested_by_name,
            u2.name as assigned_to_name
        ');
        $builder->join('assets_unified au', 'au.id = mr.asset_id', 'left');
        $builder->join('assemblies a', 'a.id = mr.assembly_id', 'left');
        $builder->join('parts p', 'p.id = mr.part_id', 'left');
        $builder->join('users u1', 'u1.id = mr.requested_by', 'left');
        $builder->join('users u2', 'u2.id = mr.assigned_to', 'left');
        $builder->orderBy('mr.created_at', 'DESC');

        if ($limit) {
            $builder->limit($limit, $offset);
        }

        return $builder->get()->getResultArray();
    }

    /**
     * Get request by ID with details
     * If asset_id is null, uses asset_name directly from the request
     */
    public function getRequestWithDetails($id)
    {
        $builder = $this->db->table($this->table . ' mr');
        $builder->select('
            mr.*,
            COALESCE(au.asset_name, mr.asset_name) as machine_name,
            au.asset_code as machine_code,`n            au.asset_type,
            a.assembly_name,
            a.assembly_code,
            p.part_name,
            p.part_number,
            u1.name as requested_by_name,
            u2.name as assigned_to_name
        ');
        $builder->join('assets_unified au', 'au.id = mr.asset_id', 'left');
        $builder->join('assemblies a', 'a.id = mr.assembly_id', 'left');
        $builder->join('parts p', 'p.id = mr.part_id', 'left');
        $builder->join('users u1', 'u1.id = mr.requested_by', 'left');
        $builder->join('users u2', 'u2.id = mr.assigned_to', 'left');
        $builder->where('mr.id', $id);

        return $builder->get()->getRowArray();
    }

    /**
     * Get requests by status
     */
    public function getRequestsByStatus($status)
    {
        return $this->where('status', $status)->findAll();
    }

    /**
     * Get requests by priority
     */
    public function getRequestsByPriority($priority)
    {
        return $this->where('priority', $priority)->findAll();
    }

    /**
     * Get requests for a specific asset
     */
    public function getRequestsByAsset($assetId)
    {
        return $this->where('asset_id', $assetId)->findAll();
    }

    /**
     * Get requests for a specific assembly
     */
    public function getRequestsByAssembly($assemblyId)
    {
        return $this->where('assembly_id', $assemblyId)->findAll();
    }

    /**
     * Get requests for a specific part
     */
    public function getRequestsByPart($partId)
    {
        return $this->where('part_id', $partId)->findAll();
    }

    /**
     * Update request status
     */
    public function updateStatus($id, $status, $notes = null)
    {
        $data = ['status' => $status];
        
        if ($notes) {
            $data['notes'] = $notes;
        }
        
        if ($status === 'completed') {
            $data['completed_date'] = date('Y-m-d H:i:s');
        }

        return $this->update($id, $data);
    }

    /**
     * Assign request to user
     */
    public function assignRequest($id, $userId)
    {
        return $this->update($id, [
            'assigned_to' => $userId,
            'status' => 'in_progress'
        ]);
    }
}
