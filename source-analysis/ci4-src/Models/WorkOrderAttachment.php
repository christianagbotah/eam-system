<?php

namespace App\Models;

use CodeIgniter\Model;

class WorkOrderAttachment extends Model
{
    protected $table = 'work_order_attachments';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'work_order_id', 'user_id', 'filename', 'original_name', 
        'file_path', 'file_size', 'mime_type', 'thumbnail_path'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = false;

    protected $validationRules = [
        'work_order_id' => 'required|integer',
        'filename' => 'required|max_length[255]',
        'original_name' => 'required|max_length[255]',
        'file_path' => 'required|max_length[500]'
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class, 'work_order_id');
    }
}