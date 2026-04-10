<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;

class AuditLogsController extends ResourceController
{
    protected $modelName = 'App\Models\AuditLogModel';
    protected $format = 'json';

    public function index()
    {
        $builder = $this->model->orderBy('created_at', 'DESC');
        
        if ($action = $this->request->getGet('action')) {
            $builder->where('action', $action);
        }
        
        if ($table = $this->request->getGet('table')) {
            $builder->where('table_name', $table);
        }
        
        if ($user = $this->request->getGet('user')) {
            $builder->where('user_id', $user);
        }
        
        $logs = $builder->findAll(100);
        
        return $this->respond(['status' => 'success', 'data' => $logs]);
    }

    public function log($userId, $action, $tableName, $recordId, $oldValues = null, $newValues = null)
    {
        $data = [
            'user_id' => $userId,
            'action' => $action,
            'table_name' => $tableName,
            'record_id' => $recordId,
            'old_values' => $oldValues ? json_encode($oldValues) : null,
            'new_values' => $newValues ? json_encode($newValues) : null,
            'ip_address' => $this->request->getIPAddress(),
            'user_agent' => $this->request->getUserAgent()->getAgentString()
        ];
        
        $this->model->insert($data);
    }
}
