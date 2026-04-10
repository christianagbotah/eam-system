<?php

namespace App\Models;

use CodeIgniter\Model;

class MaintenanceAttachmentModel extends Model
{
    protected $table = 'maintenance_attachments';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = [
        'entity_type',
        'entity_id',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
        'uploaded_by',
        'uploaded_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $validationRules = [
        'entity_type' => 'required|in_list[maintenance_request,work_order]',
        'entity_id' => 'required|integer',
        'file_name' => 'required|max_length[255]',
        'file_path' => 'required|max_length[500]',
        'uploaded_by' => 'required|integer'
    ];

    public function getByEntity($entityType, $entityId)
    {
        return $this->where(['entity_type' => $entityType, 'entity_id' => $entityId])
            ->orderBy('uploaded_at', 'DESC')
            ->findAll();
    }
}
