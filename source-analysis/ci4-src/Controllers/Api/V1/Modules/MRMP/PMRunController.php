<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;
use App\Services\PM\PMSchedulerService;

class PMRunController extends BaseResourceController
{
    protected $schedulerService;

    public function __construct()
    {
        $this->schedulerService = new PMSchedulerService();
    }

    public function run()
    {
        try {
            $payload = $this->request->getJSON(true);
            
            $options = [
                'from' => $payload['from'] ?? date('Y-m-d'),
                'to' => $payload['to'] ?? date('Y-m-d', strtotime('+30 days')),
                'date' => $payload['date'] ?? date('Y-m-d'),
                'dry_run' => $payload['dry_run'] ?? false,
                'verbose' => $payload['verbose'] ?? false
            ];

            $result = $this->schedulerService->runScheduler($options);

            return $this->respond([
                'success' => $result['success'],
                'data' => $result,
                'error' => $result['error'] ?? null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
