<?php
namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\Api\V1\BaseApiController;

class DigitalTwinController extends BaseApiController {
    
    public function metrics() {
        return $this->respond([
            'success' => true,
            'data' => [
                'totalModels' => 0,
                'activeSimulations' => 0,
                'dataPoints' => 0,
                'lastSync' => date('Y-m-d H:i:s')
            ]
        ]);
    }
}
