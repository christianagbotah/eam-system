<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\BaseController;
use App\Services\PM\PMTriggerService;
use CodeIgniter\HTTP\ResponseInterface;

class PMTriggersController extends BaseController
{
    protected $triggerService;
    protected $db;

    public function __construct()
    {
        $this->triggerService = new PMTriggerService();
        $this->db = \Config\Database::connect();
    }

    public function index($templateId): ResponseInterface
    {
        try {
            $triggers = $this->triggerService->listTriggers($templateId);

            return $this->respond([
                'success' => true,
                'data' => $triggers,
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function create($templateId): ResponseInterface
    {
        try {
            $payload = $this->request->getJSON(true);
            $payload['pm_template_id'] = $templateId;
            $payload['created_at'] = date('Y-m-d H:i:s');

            $triggerId = $this->db->table('pm_triggers')->insert($payload);

            return $this->respond([
                'success' => true,
                'data' => ['id' => $triggerId],
                'error' => null
            ], 201);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 400);
        }
    }

    public function update($triggerId): ResponseInterface
    {
        try {
            $payload = $this->request->getJSON(true);
            $payload['updated_at'] = date('Y-m-d H:i:s');

            $result = $this->db->table('pm_triggers')->where('id', $triggerId)->update($payload);

            if (!$result) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Trigger not found'
                ], 404);
            }

            return $this->respond([
                'success' => true,
                'data' => ['updated' => true],
                'error' => null
            ]);

        } catch (\Exception $e) {
            return $this->respond([
                'success' => false,
                'data' => null,
                'error' => $e->getMessage()
            ], 400);
        }
    }

    public function delete($triggerId): ResponseInterface
    {
        try {
            $result = $this->db->table('pm_triggers')->where('id', $triggerId)->delete();

            if (!$result) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Trigger not found'
                ], 404);
            }

            return $this->respond([
                'success' => true,
                'data' => ['deleted' => true],
                'error' => null
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
