<?php

namespace App\Models;

use CodeIgniter\Model;

class ToolModel extends Model
{
    protected $table = 'tools';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'plant_id', 'tool_code', 'tool_name', 'category', 'description',
        'manufacturer', 'model_number', 'serial_number', 'quantity_available',
        'quantity_in_use', 'location', 'condition_status', 'availability_status',
        'calibration_required', 'is_calibrated', 'last_calibration_date',
        'next_calibration_date', 'calibration_due_date', 'purchase_date',
        'purchase_cost', 'replacement_cost', 'image_url', 'barcode',
        'is_active', 'notes', 'created_by'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'plant_id' => 'required|integer',
        'tool_code' => 'required|max_length[50]',
        'tool_name' => 'required|max_length[255]',
        'category' => 'permit_empty|max_length[100]',
    ];

    protected $validationMessages = [];
    protected $skipValidation = false;

    /**
     * Get available tools for a plant
     */
    public function getAvailableTools($plantId)
    {
        return $this->where('plant_id', $plantId)
            ->where('is_active', 1)
            ->where('availability_status', 'AVAILABLE')
            ->findAll();
    }

    /**
     * Get tools requiring calibration
     */
    public function getCalibrationDue($plantId, $days = 30)
    {
        $dueDate = date('Y-m-d', strtotime("+{$days} days"));
        
        return $this->where('plant_id', $plantId)
            ->where('is_calibrated', 1)
            ->where('calibration_due_date <=', $dueDate)
            ->where('is_active', 1)
            ->findAll();
    }

    /**
     * Check if tool can be deleted
     */
    public function canDelete($toolId)
    {
        $db = \Config\Database::connect();
        
        // Check active requests
        $activeRequests = $db->table('work_order_tool_requests')
            ->where('tool_id', $toolId)
            ->whereIn('request_status', ['PENDING', 'APPROVED', 'ISSUED', 'RETURN_PENDING'])
            ->countAllResults();

        return $activeRequests === 0;
    }
}
