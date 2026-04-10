<?php

namespace App\Models;

use CodeIgniter\Model;

class ModelNavigationHistoryModel extends Model
{
    protected $table = 'model_navigation_history';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'user_id', 'model_id', 'navigation_path', 'view_state'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'timestamp';
    protected $updatedField = '';

    protected $validationRules = [
        'user_id' => 'required|integer',
        'model_id' => 'required|integer'
    ];

    public function getRecentNavigation($userId, $limit = 10)
    {
        return $this->where('user_id', $userId)
                   ->orderBy('timestamp', 'DESC')
                   ->limit($limit)
                   ->findAll();
    }

    public function getUserModelHistory($userId, $modelId)
    {
        return $this->where('user_id', $userId)
                   ->where('model_id', $modelId)
                   ->orderBy('timestamp', 'DESC')
                   ->findAll();
    }
}