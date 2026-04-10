<?php

namespace App\Controllers\Api\V1\Modules\ASSET;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\ModelHotspotModel;
use App\Models\PmTaskModel;
use App\Models\PmTemplateModel;

class PMIntegrationController extends BaseApiController
{
    public function assignTaskToNode()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $rules = [
                'hotspot_id' => 'required|integer',
                'pm_template_id' => 'required|integer',
                'frequency_days' => 'required|integer|greater_than[0]',
                'priority' => 'permit_empty|in_list[low,medium,high,critical]'
            ];

            if (!$this->validate($rules)) {
                return $this->failValidationErrors($this->validator->getErrors());
            }

            // Get hotspot details
            $hotspotModel = new ModelHotspotModel();
            $hotspot = $hotspotModel->find($data['hotspot_id']);
            
            if (!$hotspot) {
                return $this->failNotFound('Hotspot not found');
            }

            // Create PM task
            $pmTaskModel = new PmTaskModel();
            $taskData = [
                'pm_template_id' => $data['pm_template_id'],
                'asset_node_type' => $hotspot['node_type'],
                'asset_node_id' => $hotspot['node_id'],
                'frequency_days' => $data['frequency_days'],
                'next_due_date' => date('Y-m-d', strtotime('+' . $data['frequency_days'] . ' days')),
                'priority' => $data['priority'] ?? 'medium',
                'status' => 'active',
                'assigned_technician_id' => $data['assigned_technician_id'] ?? null,
                'notes' => $data['notes'] ?? null,
                'metadata_json' => json_encode([
                    'hotspot_id' => $data['hotspot_id'],
                    'model_id' => $hotspot['model_id'],
                    'assigned_from_diagram' => true,
                    'coordinates' => [
                        'x' => $hotspot['x'],
                        'y' => $hotspot['y'],
                        'z' => $hotspot['z']
                    ]
                ])
            ];

            $taskId = $pmTaskModel->insert($taskData);

            return $this->respondCreated([
                'task_id' => $taskId,
                'message' => 'PM task assigned successfully'
            ]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function getNodeTasks($nodeType, $nodeId)
    {
        try {
            $pmTaskModel = new PmTaskModel();
            $tasks = $pmTaskModel->where('asset_node_type', $nodeType)
                               ->where('asset_node_id', $nodeId)
                               ->where('status', 'active')
                               ->findAll();

            return $this->respond([
                'node_type' => $nodeType,
                'node_id' => $nodeId,
                'tasks' => $tasks
            ]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function getAvailableTemplates()
    {
        try {
            $templateModel = new PmTemplateModel();
            $templates = $templateModel->where('is_active', true)->findAll();

            return $this->respond(['templates' => $templates]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }
}
