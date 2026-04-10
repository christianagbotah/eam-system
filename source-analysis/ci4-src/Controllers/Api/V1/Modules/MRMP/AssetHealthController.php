<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;

class AssetHealthController extends BaseResourceController
{
    protected $format = 'json';

    public function summary()
    {
        $db = \Config\Database::connect();
        
        $data = $db->table('mv_asset_health_summary')
            ->orderBy('health_score', 'ASC')
            ->get()
            ->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => $data
        ]);
    }

    public function critical()
    {
        $db = \Config\Database::connect();
        
        $data = $db->table('mv_asset_health_summary')
            ->where('health_score <', 60)
            ->orWhere('overdue_work_orders >', 0)
            ->orderBy('health_score', 'ASC')
            ->get()
            ->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => $data
        ]);
    }

    public function refresh()
    {
        $db = \Config\Database::connect();
        $db->query('CALL refresh_asset_health_summary()');

        return $this->respond([
            'success' => true,
            'message' => 'Asset health summary refreshed'
        ]);
    }
}
