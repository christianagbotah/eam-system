<?php

namespace App\Controllers\Api\V1\Modules\Core;

use CodeIgniter\RESTful\ResourceController;
use App\Models\TechnicianSkillModel;
use App\Models\WorkOrderOfflineQueueModel;
use App\Models\WorkOrderLaborEnhancedModel;
use App\Models\WorkOrderInterruptionModel;
use App\Models\WorkOrderPartSubstitutionModel;
use App\Models\WorkOrderDelayModel;
use App\Models\WorkOrderAuthorityOverrideModel;
use App\Models\WorkOrderAuditLogModel;
use App\Models\AssetFailureAnalysisModel;
use App\Models\LaborRateConfigModel;

class GhanaEnhancementsController extends ResourceController
{
    protected $format = 'json';

    // ==================== SKILL MANAGEMENT ====================
    
    public function getTechnicianSkills($technicianId)
    {
        $model = new TechnicianSkillModel();
        $skills = $model->where('technician_id', $technicianId)->findAll();
        return $this->respond(['status' => 'success', 'data' => $skills]);
    }

    public function addTechnicianSkill($technicianId)
    {
        $model = new TechnicianSkillModel();
        $data = $this->request->getJSON(true);
        $data['technician_id'] = $technicianId;
        
        return $model->insert($data) 
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()])
            : $this->fail($model->errors());
    }

    public function searchBySkill()
    {
        $skill = $this->request->getGet('skill');
        $level = $this->request->getGet('level');
        
        $db = \Config\Database::connect();
        $builder = $db->table('technician_skills ts')
            ->select('ts.*, u.username, u.email')
            ->join('users u', 'u.id = ts.technician_id')
            ->where('ts.skill_name', $skill);
        
        if ($level) $builder->where('ts.proficiency_level', $level);
        
        $results = $builder->get()->getResultArray();
        return $this->respond(['status' => 'success', 'data' => $results]);
    }

    // ==================== OFFLINE SYNC ====================
    
    public function saveOffline($workOrderId)
    {
        $model = new WorkOrderOfflineQueueModel();
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $workOrderId;
        $data['offline_data'] = json_encode($data['offline_data']);
        
        return $model->insert($data)
            ? $this->respondCreated(['status' => 'success', 'queued' => true])
            : $this->fail($model->errors());
    }

    public function syncQueue()
    {
        $model = new WorkOrderOfflineQueueModel();
        $queue = $model->where('synced', false)->orderBy('offline_timestamp', 'ASC')->findAll();
        
        $synced = 0;
        $failed = 0;
        
        foreach ($queue as $item) {
            try {
                $data = json_decode($item['offline_data'], true);
                // Process sync logic here
                $model->update($item['id'], ['synced' => true, 'synced_at' => date('Y-m-d H:i:s')]);
                $synced++;
            } catch (\Exception $e) {
                $model->update($item['id'], ['sync_error' => $e->getMessage()]);
                $failed++;
            }
        }
        
        return $this->respond(['status' => 'success', 'synced' => $synced, 'failed' => $failed]);
    }

    // ==================== INTERRUPTIONS ====================
    
    public function logInterruption($workOrderId)
    {
        $model = new WorkOrderInterruptionModel();
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $workOrderId;
        
        return $model->insert($data)
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()])
            : $this->fail($model->errors());
    }

    public function getInterruptions($workOrderId)
    {
        $model = new WorkOrderInterruptionModel();
        $interruptions = $model->where('work_order_id', $workOrderId)->findAll();
        return $this->respond(['status' => 'success', 'data' => $interruptions]);
    }

    // ==================== ENHANCED LABOR ====================
    
    public function addLaborEnhanced($workOrderId)
    {
        $model = new WorkOrderLaborEnhancedModel();
        $rateModel = new LaborRateConfigModel();
        
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $workOrderId;
        
        // Get multiplier from config
        $rateConfig = $rateModel->where('labor_type', $data['labor_type'])
            ->where('active', true)->first();
        
        if ($rateConfig) {
            $data['multiplier'] = $rateConfig['base_multiplier'];
        }
        
        // Validate justification for overtime/emergency
        if (in_array($data['labor_type'], ['overtime', 'emergency']) && empty($data['justification'])) {
            return $this->fail('Justification required for ' . $data['labor_type'] . ' labor');
        }
        
        return $model->insert($data)
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()])
            : $this->fail($model->errors());
    }

    public function approveOvertimeLabor($workOrderId, $laborId)
    {
        $model = new WorkOrderLaborEnhancedModel();
        $data = $this->request->getJSON(true);
        
        return $model->update($laborId, [
            'approved_by' => $data['approved_by'],
            'approved_at' => date('Y-m-d H:i:s')
        ]) ? $this->respond(['status' => 'success']) : $this->fail('Approval failed');
    }

    public function getLaborBreakdown($workOrderId)
    {
        $db = \Config\Database::connect();
        $breakdown = $db->table('work_order_labor_enhanced')
            ->select('labor_type, SUM(hours_worked) as total_hours, SUM(total_cost) as total_cost')
            ->where('work_order_id', $workOrderId)
            ->groupBy('labor_type')
            ->get()->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $breakdown]);
    }

    // ==================== PART SUBSTITUTIONS ====================
    
    public function addPartSubstitution($workOrderId)
    {
        $model = new WorkOrderPartSubstitutionModel();
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $workOrderId;
        $data['approved_at'] = date('Y-m-d H:i:s');
        
        return $model->insert($data)
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()])
            : $this->fail($model->errors());
    }

    public function getSubstitutions($workOrderId)
    {
        $model = new WorkOrderPartSubstitutionModel();
        $subs = $model->where('work_order_id', $workOrderId)->findAll();
        return $this->respond(['status' => 'success', 'data' => $subs]);
    }

    // ==================== DELAYS ====================
    
    public function logDelay($workOrderId)
    {
        $model = new WorkOrderDelayModel();
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $workOrderId;
        
        return $model->insert($data)
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()])
            : $this->fail($model->errors());
    }

    public function getDelays()
    {
        $model = new WorkOrderDelayModel();
        $type = $this->request->getGet('type');
        
        $query = $type ? $model->where('delay_type', $type) : $model;
        $delays = $query->orderBy('delay_start', 'DESC')->findAll();
        
        return $this->respond(['status' => 'success', 'data' => $delays]);
    }

    // ==================== AUTHORITY OVERRIDES ====================
    
    public function addOverride($workOrderId)
    {
        $model = new WorkOrderAuthorityOverrideModel();
        $data = $this->request->getJSON(true);
        $data['work_order_id'] = $workOrderId;
        
        return $model->insert($data)
            ? $this->respondCreated(['status' => 'success', 'id' => $model->getInsertID()])
            : $this->fail($model->errors());
    }

    public function getOverrides($workOrderId)
    {
        $model = new WorkOrderAuthorityOverrideModel();
        $overrides = $model->where('work_order_id', $workOrderId)->findAll();
        return $this->respond(['status' => 'success', 'data' => $overrides]);
    }

    // ==================== AUDIT LOG ====================
    
    public function getAuditLog($workOrderId)
    {
        $model = new WorkOrderAuditLogModel();
        $logs = $model->where('work_order_id', $workOrderId)
            ->orderBy('changed_at', 'DESC')->findAll();
        return $this->respond(['status' => 'success', 'data' => $logs]);
    }

    // ==================== REPORTS ====================
    
    public function failureAnalysisReport()
    {
        $assetId = $this->request->getGet('asset_id');
        $db = \Config\Database::connect();
        
        $builder = $db->table('asset_failure_analysis afa')
            ->select('afa.*, a.name as asset_name, fc.code as failure_code')
            ->join('assets a', 'a.id = afa.asset_id', 'left')
            ->join('failure_codes fc', 'fc.id = afa.failure_code_id', 'left')
            ->orderBy('afa.failure_date', 'DESC');
        
        if ($assetId) $builder->where('afa.asset_id', $assetId);
        
        $results = $builder->get()->getResultArray();
        return $this->respond(['status' => 'success', 'data' => $results]);
    }

    public function costTrendsReport()
    {
        $period = $this->request->getGet('period') ?? 'monthly';
        $db = \Config\Database::connect();
        
        $trends = $db->table('maintenance_cost_trends')
            ->where('period_type', $period)
            ->orderBy('period_start', 'DESC')
            ->limit(12)
            ->get()->getResultArray();
        
        return $this->respond(['status' => 'success', 'data' => $trends]);
    }

    public function downtimeCausesReport()
    {
        $assetId = $this->request->getGet('asset_id');
        $db = \Config\Database::connect();
        
        $builder = $db->table('downtime_cause_analysis dca')
            ->select('dca.*, a.name as asset_name')
            ->join('assets a', 'a.id = dca.asset_id', 'left')
            ->orderBy('dca.downtime_start', 'DESC');
        
        if ($assetId) $builder->where('dca.asset_id', $assetId);
        
        $results = $builder->get()->getResultArray();
        return $this->respond(['status' => 'success', 'data' => $results]);
    }
}
