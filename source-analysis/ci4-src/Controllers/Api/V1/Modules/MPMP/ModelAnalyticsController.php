<?php

namespace App\Controllers\Api\V1\Modules\MPMP;

use App\Controllers\Api\V1\BaseResourceController;

class ModelAnalyticsController extends BaseResourceController
{
    protected $modelName = 'App\Models\ThreeDModelModel';
    protected $format = 'json';

    public function getUsageStats()
    {
        $model = new \App\Models\ThreeDModelModel();
        $db = \Config\Database::connect();
        
        $stats = [
            'total_models' => $model->countAll(),
            'by_status' => $db->table('3d_models')->select('status, COUNT(*) as count')->groupBy('status')->get()->getResultArray(),
            'by_machine' => $db->table('3d_models')->select('machine_id, COUNT(*) as count')->where('machine_id IS NOT NULL')->groupBy('machine_id')->get()->getResultArray(),
            'recent_uploads' => $db->table('3d_models')->select('DATE(created_at) as date, COUNT(*) as count')->where('created_at >=', date('Y-m-d', strtotime('-30 days')))->groupBy('DATE(created_at)')->get()->getResultArray(),
            'storage_used' => $db->table('3d_models')->selectSum('file_size')->get()->getRow()->file_size ?? 0
        ];

        return $this->respond($stats);
    }

    public function getModelActivity($id)
    {
        $db = \Config\Database::connect();
        
        $activity = $db->table('activity_logs')
            ->where('entity_type', '3d_model')
            ->where('entity_id', $id)
            ->orderBy('created_at', 'DESC')
            ->limit(50)
            ->get()
            ->getResultArray();

        return $this->respond($activity);
    }
}
