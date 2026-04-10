<?php

namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseApiController;
use App\Models\PmTemplateModel;
use App\Services\PM\PMSchedulerService;

class PmController extends BaseApiController
{
    protected $pmModel;
    protected $scheduler;

    public function __construct()
    {
        $this->pmModel = new PmTemplateModel();
        $this->scheduler = new PMSchedulerService();
    }

    public function index()
    {
        try {
            $search = $this->request->getGet('search');
            $priority = $this->request->getGet('priority');
            $status = $this->request->getGet('status');
            
            $builder = $this->pmModel->builder();
            
            if ($search) {
                $builder->like('pm_title', $search);
            }
            if ($priority) {
                $builder->where('priority', $priority);
            }
            if ($status) {
                $builder->where('status', $status);
            }
            
            $templates = $builder->get()->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $templates
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function show($id = null)
    {
        try {
            $template = $this->pmModel->getWithDetails($id);
            if (!$template) {
                return $this->failNotFound('PM Template not found');
            }
            return $this->respond([
                'status' => 'success',
                'data' => $template
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function create()
    {
        try {
            $data = $this->request->getJSON(true);
            
            // Generate PM code
            if (empty($data['pm_code'])) {
                $data['pm_code'] = $this->generatePmCode();
            }

            // Insert template
            $templateId = $this->pmModel->insert($data);

            // Insert triggers
            if (!empty($data['triggers'])) {
                foreach ($data['triggers'] as $trigger) {
                    $trigger['pm_template_id'] = $templateId;
                    $this->db->table('pm_triggers')->insert($trigger);
                }
            }

            // Insert checklist
            if (!empty($data['checklist'])) {
                $checklistId = $this->db->table('pm_checklists')->insert([
                    'pm_template_id' => $templateId,
                    'checklist_name' => $data['pm_title'] . ' Checklist',
                    'created_at' => date('Y-m-d H:i:s'),
                ]);

                if (!empty($data['checklist']['items'])) {
                    foreach ($data['checklist']['items'] as $item) {
                        $item['pm_checklist_id'] = $checklistId;
                        $this->db->table('pm_checklist_items')->insert($item);
                    }
                }
            }

            // Insert required spares
            if (!empty($data['required_spares'])) {
                foreach ($data['required_spares'] as $spare) {
                    $spare['pm_template_id'] = $templateId;
                    $this->db->table('pm_required_spares')->insert($spare);
                }
            }

            // Evaluate template
            $this->scheduler->evaluatePmTemplate($templateId);

            return $this->respondCreated([
                'status' => 'success',
                'message' => 'PM Template created successfully',
                'data' => ['id' => $templateId, 'pm_code' => $data['pm_code']]
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function update($id = null)
    {
        try {
            $template = $this->pmModel->find($id);
            if (!$template) {
                return $this->failNotFound('PM Template not found');
            }

            $data = $this->request->getJSON(true);
            $this->pmModel->update($id, $data);

            return $this->respond([
                'status' => 'success',
                'message' => 'PM Template updated successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function delete($id = null)
    {
        try {
            $template = $this->pmModel->find($id);
            if (!$template) {
                return $this->failNotFound('PM Template not found');
            }

            $this->pmModel->delete($id);

            return $this->respondDeleted([
                'status' => 'success',
                'message' => 'PM Template deleted successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function runScheduler()
    {
        $result = $this->scheduler->runScheduler();
        return $this->respond([
            'status' => 'success',
            'data' => $result
        ]);
    }

    public function getKpis()
    {
        $db = \Config\Database::connect();
        $totalTemplates = $db->table('pm_templates')->countAllResults();
        $activeTemplates = $db->table('pm_templates')->where('active', 1)->countAllResults();
        
        return $this->respond([
            'status' => 'success',
            'data' => [
                'total_templates' => $totalTemplates,
                'active_templates' => $activeTemplates
            ]
        ]);
    }

    public function getWorkOrders()
    {
        try {
            $status = $this->request->getGet('status');
            $assignedTo = $this->request->getGet('assigned_to');
            
            $builder = $this->db->table('pm_work_orders')
                ->select('pm_work_orders.*, pm_templates.pm_title, asset_nodes.node_name')
                ->join('pm_templates', 'pm_templates.id = pm_work_orders.pm_template_id')
                ->join('asset_nodes', 'asset_nodes.id = pm_work_orders.asset_node_id');
            
            if ($status) {
                $builder->where('pm_work_orders.status', $status);
            }
            if ($assignedTo) {
                $builder->where('pm_work_orders.assigned_to', $assignedTo);
            }
            
            $workOrders = $builder->get()->getResultArray();
            
            return $this->respond([
                'status' => 'success',
                'data' => $workOrders
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function updateWorkOrder($id)
    {
        try {
            $data = $this->request->getJSON(true);
            
            $this->db->table('pm_work_orders')->where('id', $id)->update($data);

            // If completed, update schedule
            if ($data['status'] === 'completed') {
                $wo = $this->db->table('pm_work_orders')->where('id', $id)->get()->getRowArray();
                $this->db->table('pm_schedule')->where('id', $wo['pm_schedule_id'])->update([
                    'status' => 'completed',
                    'last_completed' => date('Y-m-d H:i:s'),
                ]);
                
                // Re-evaluate template
                $this->scheduler->evaluatePmTemplate($wo['pm_template_id']);
            }

            return $this->respond([
                'status' => 'success',
                'message' => 'Work Order updated successfully'
            ]);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }



    private function generatePmCode()
    {
        $lastPm = $this->pmModel->orderBy('id', 'DESC')->first();
        $lastId = $lastPm ? $lastPm['id'] : 0;
        return 'PM-' . str_pad($lastId + 1, 5, '0', STR_PAD_LEFT);
    }

    // PM Rules Management (from EamPmController)
    public function getRules()
    {
        $params = $this->request->getGet();
        $service = new \App\Services\EamPmService();
        $result = $service->getAllRules($params);
        return $this->respond($result);
    }

    public function createRule()
    {
        $data = $this->request->getJSON(true);
        $service = new \App\Services\EamPmService();
        $result = $service->createRule($data);
        return $this->respond($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function updateRule($id = null)
    {
        $data = $this->request->getJSON(true);
        $service = new \App\Services\EamPmService();
        $result = $service->updateRule($id, $data);
        return $this->respond($result);
    }

    public function generateSchedules()
    {
        $data = $this->request->getJSON(true);
        $service = new \App\Services\EamPmService();
        $result = $service->generateSchedules($data);
        return $this->respond($result);
    }

    public function getSchedules($assetId = null)
    {
        $params = $this->request->getGet();
        $service = new \App\Services\EamPmService();
        if ($assetId) {
            $result = $service->getSchedulesByAsset($assetId, $params);
        } else {
            $result = $service->getAllSchedules($params);
        }
        return $this->respond($result);
    }

    public function generateSchedule($ruleId)
    {
        $service = new \App\Services\EamPmService();
        $result = $service->generateScheduleFromRule($ruleId);
        return $this->respond($result, $result['status'] === 'success' ? 201 : 400);
    }

    public function recomputeNext($id = null)
    {
        $service = new \App\Services\EamPmService();
        $result = $service->recomputeNextDue($id);
        return $this->respond($result);
    }

    public function createFromModel()
    {
        try {
            $data = $this->request->getJSON(true);
            
            $rules = [
                'hotspot_id' => 'required|integer',
                'pm_template_id' => 'required|integer',
                'frequency_days' => 'required|integer|greater_than[0]'
            ];

            if (!$this->validate($rules)) {
                return $this->failValidationErrors($this->validator->getErrors());
            }

            $hotspotModel = new \App\Models\ModelHotspotModel();
            $hotspot = $hotspotModel->find($data['hotspot_id']);
            
            if (!$hotspot) {
                return $this->failNotFound('Hotspot not found');
            }

            $pmTaskModel = new \App\Models\PmTaskModel();
            $taskData = [
                'pm_template_id' => $data['pm_template_id'],
                'asset_node_type' => $hotspot['node_type'],
                'asset_node_id' => $hotspot['node_id'],
                'frequency_days' => $data['frequency_days'],
                'next_due_date' => date('Y-m-d', strtotime('+' . $data['frequency_days'] . ' days')),
                'status' => 'active',
                'metadata_json' => json_encode([
                    'hotspot_id' => $data['hotspot_id'],
                    'model_id' => $hotspot['model_id'],
                    'created_from_model' => true
                ])
            ];

            $taskId = $pmTaskModel->insert($taskData);

            return $this->respondCreated([
                'task_id' => $taskId,
                'message' => 'PM task created from model'
            ]);

        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }
}
