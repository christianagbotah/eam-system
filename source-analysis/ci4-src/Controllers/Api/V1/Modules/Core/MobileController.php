<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;
use App\Services\WorkOrders\WOSyncService;

class MobileController extends ResourceController
{
    protected $syncService;
    protected $format = 'json';

    public function __construct()
    {
        $this->syncService = new WOSyncService();
    }

    public function woSync()
    {
        $payload = $this->request->getJSON(true);
        
        if (!isset($payload['batch_id']) || !isset($payload['operations'])) {
            return $this->fail('Invalid payload');
        }

        $payload['user_id'] = $this->request->user_id ?? 1;

        try {
            $result = $this->syncService->applyMobileBatch($payload);
            return $this->respond($result);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }
}
