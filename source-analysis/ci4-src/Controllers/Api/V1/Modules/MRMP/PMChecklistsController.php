<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\ResponseInterface;

class PMChecklistsController extends BaseController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    public function index($templateId): ResponseInterface
    {
        try {
            $checklists = $this->db->table('pm_checklists')
                ->where('pm_template_id', $templateId)
                ->orderBy('sequence')
                ->get()->getResultArray();

            foreach ($checklists as &$checklist) {
                $checklist['items'] = $this->db->table('pm_checklist_items')
                    ->where('pm_checklist_id', $checklist['id'])
                    ->orderBy('sequence')
                    ->get()->getResultArray();
            }

            return $this->respond([
                'success' => true,
                'data' => $checklists,
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

            $checklistId = $this->db->table('pm_checklists')->insert($payload);

            return $this->respond([
                'success' => true,
                'data' => ['id' => $checklistId],
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

    public function createItem($checklistId): ResponseInterface
    {
        try {
            $payload = $this->request->getJSON(true);
            $payload['pm_checklist_id'] = $checklistId;
            $payload['created_at'] = date('Y-m-d H:i:s');

            $itemId = $this->db->table('pm_checklist_items')->insert($payload);

            return $this->respond([
                'success' => true,
                'data' => ['id' => $itemId],
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

    public function updateItem($itemId): ResponseInterface
    {
        try {
            $payload = $this->request->getJSON(true);

            $result = $this->db->table('pm_checklist_items')->where('id', $itemId)->update($payload);

            if (!$result) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Checklist item not found'
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

    public function deleteItem($itemId): ResponseInterface
    {
        try {
            $result = $this->db->table('pm_checklist_items')->where('id', $itemId)->delete();

            if (!$result) {
                return $this->respond([
                    'success' => false,
                    'data' => null,
                    'error' => 'Checklist item not found'
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
