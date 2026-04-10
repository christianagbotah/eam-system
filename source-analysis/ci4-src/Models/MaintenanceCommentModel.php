<?php

namespace App\Models;

use CodeIgniter\Model;

class MaintenanceCommentModel extends Model
{
    protected $table = 'maintenance_comments';
    protected $primaryKey = 'id';
    protected $returnType = 'array';
    protected $allowedFields = ['entity_type', 'entity_id', 'comment', 'user_id'];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = '';
    protected $validationRules = [
        'entity_type' => 'required|in_list[maintenance_request,work_order]',
        'entity_id' => 'required|integer',
        'comment' => 'required',
        'user_id' => 'required|integer'
    ];

    public function getByEntity($entityType, $entityId)
    {
        return $this->select('maintenance_comments.*, users.name as user_name')
            ->join('users', 'users.id = maintenance_comments.user_id')
            ->where(['entity_type' => $entityType, 'entity_id' => $entityId])
            ->orderBy('created_at', 'ASC')
            ->findAll();
    }
}
