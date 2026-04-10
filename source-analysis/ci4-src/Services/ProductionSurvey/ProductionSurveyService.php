<?php

namespace App\Services\ProductionSurvey;

use App\Models\ProductionSurveyModel;
use App\Models\AssetHistoryModel;
use App\Services\ProductionSurvey\AlertService;
use DateTime;

class ProductionSurveyService
{
    protected $surveyModel;
    protected $historyModel;
    protected $alertService;
    protected $db;

    public function __construct()
    {
        $this->surveyModel = new ProductionSurveyModel();
        $this->historyModel = new AssetHistoryModel();
        $this->alertService = new AlertService();
        $this->db = \Config\Database::connect();
    }

    public function createSurvey(array $data, int $userId)
    {
        $data['survey_code'] = $this->surveyModel->generateSurveyCode();
        $data['operator_id'] = $userId;
        $data['status'] = 'Draft';
        
        $this->calculateTimes($data);
        $this->validateData($data);
        
        $surveyId = $this->surveyModel->insert($data);
        
        if ($surveyId) {
            $this->logHistory($surveyId, 'created', $userId, $data);
        }
        
        return $surveyId;
    }

    public function updateSurvey(int $id, array $data, int $userId)
    {
        $survey = $this->surveyModel->find($id);
        if (!$survey || $survey['status'] !== 'Draft') {
            throw new \Exception('Survey cannot be edited');
        }
        
        $this->calculateTimes($data);
        $this->validateData($data);
        
        $updated = $this->surveyModel->update($id, $data);
        
        if ($updated) {
            $this->logHistory($id, 'updated', $userId, $data);
        }
        
        return $updated;
    }

    public function submitSurvey(int $id, int $userId)
    {
        $survey = $this->surveyModel->find($id);
        if (!$survey || $survey['status'] !== 'Draft') {
            throw new \Exception('Survey cannot be submitted');
        }
        
        $this->surveyModel->update($id, ['status' => 'Submitted']);
        $this->logHistory($id, 'submitted', $userId);
        
        return true;
    }

    public function approveSurvey(int $id, int $supervisorId)
    {
        $survey = $this->surveyModel->find($id);
        if (!$survey || $survey['status'] !== 'Submitted') {
            throw new \Exception('Survey cannot be approved');
        }
        
        $this->surveyModel->update($id, [
            'status' => 'Approved',
            'supervisor_id' => $supervisorId
        ]);
        
        $this->logHistory($id, 'approved', $supervisorId);
        $this->checkUsageBasedPM($survey);
        $this->alertService->checkAlerts($survey);
        
        return true;
    }

    protected function checkUsageBasedPM(array $survey)
    {
        if (empty($survey['units_produced']) && empty($survey['cycles_completed'])) {
            return;
        }

        $builder = $this->db->table('pm_usage_triggers');
        $triggers = $builder->where('machine_id', $survey['machine_id'])
                           ->where('status', 'active')
                           ->get()->getResultArray();

        foreach ($triggers as $trigger) {
            $newValue = $trigger['current_value'];
            
            if ($trigger['trigger_type'] === 'units' && !empty($survey['units_produced'])) {
                $newValue += $survey['units_produced'];
            } elseif ($trigger['trigger_type'] === 'cycles' && !empty($survey['cycles_completed'])) {
                $newValue += $survey['cycles_completed'];
            }

            if ($newValue >= $trigger['threshold_value']) {
                $builder->where('id', $trigger['id'])->update([
                    'current_value' => $newValue,
                    'status' => 'triggered',
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
                
                $this->surveyModel->update($survey['id'], ['trigger_pm_check' => 1]);
            } else {
                $builder->where('id', $trigger['id'])->update([
                    'current_value' => $newValue,
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }
        }
    }

    public function rejectSurvey(int $id, int $supervisorId, string $reason)
    {
        $survey = $this->surveyModel->find($id);
        if (!$survey || $survey['status'] !== 'Submitted') {
            throw new \Exception('Survey cannot be rejected');
        }
        
        $this->surveyModel->update($id, [
            'status' => 'Rejected',
            'supervisor_id' => $supervisorId,
            'comments' => ($survey['comments'] ?? '') . "\n[REJECTED]: " . $reason
        ]);
        
        $this->logHistory($id, 'rejected', $supervisorId, ['reason' => $reason]);
        
        return true;
    }

    protected function calculateTimes(array &$data)
    {
        if (isset($data['start_time']) && isset($data['end_time'])) {
            $start = new DateTime($data['start_time']);
            $end = new DateTime($data['end_time']);
            
            if ($end < $start) {
                $end->modify('+1 day');
            }
            
            $diff = $start->diff($end);
            $totalMinutes = ($diff->h * 60) + $diff->i;
            
            $data['runtime_minutes'] = $totalMinutes - ($data['downtime_minutes'] ?? 0);
        }
        
        if (isset($data['target_units']) && isset($data['units_produced']) && $data['target_units'] > 0) {
            $data['efficiency_percent'] = ($data['units_produced'] / $data['target_units']) * 100;
            $data['variance_percent'] = $data['efficiency_percent'] - 100;
        }
        
        if (isset($data['setup_start_time']) && isset($data['setup_end_time'])) {
            $setupStart = new DateTime($data['setup_start_time']);
            $setupEnd = new DateTime($data['setup_end_time']);
            $diff = $setupStart->diff($setupEnd);
            $data['changeover_duration_minutes'] = ($diff->h * 60) + $diff->i;
        }
    }

    protected function validateData(array $data)
    {
        if (isset($data['downtime_minutes']) && $data['downtime_minutes'] > 0) {
            if (empty($data['downtime_reason'])) {
                throw new \Exception('Downtime reason required when downtime > 0');
            }
        }
        
        if (isset($data['defects_count']) && $data['defects_count'] > 0) {
            $defectTypes = json_decode($data['defect_types'] ?? '[]', true);
            if (count($defectTypes) !== $data['defects_count']) {
                throw new \Exception('Defect count must match defect types');
            }
        }
    }

    protected function logHistory(int $surveyId, string $action, int $userId, array $changes = [])
    {
        $survey = $this->surveyModel->find($surveyId);
        
        $this->historyModel->insert([
            'asset_type' => 'machine',
            'asset_id' => $survey['machine_id'],
            'action' => "Production Survey {$action}",
            'user_id' => $userId,
            'changes' => json_encode([
                'survey_id' => $surveyId,
                'survey_code' => $survey['survey_code'],
                'changes' => $changes
            ])
        ]);
    }

    public function getKPIs(array $filters = [])
    {
        $builder = $this->surveyModel->builder();
        
        if (!empty($filters['date_from'])) {
            $builder->where('date >=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $builder->where('date <=', $filters['date_to']);
        }
        if (!empty($filters['machine_id'])) {
            $builder->where('machine_id', $filters['machine_id']);
        }
        
        $surveys = $builder->where('status', 'Approved')->findAll();
        
        $totalRuntime = array_sum(array_column($surveys, 'runtime_minutes'));
        $totalDowntime = array_sum(array_column($surveys, 'downtime_minutes'));
        $totalDefects = array_sum(array_column($surveys, 'defects_count'));
        
        $availability = $totalRuntime > 0 
            ? ($totalRuntime / ($totalRuntime + $totalDowntime)) * 100 
            : 0;
        
        return [
            'total_runtime' => $totalRuntime,
            'total_downtime' => $totalDowntime,
            'total_defects' => $totalDefects,
            'oee_availability' => round($availability, 2),
            'defect_rate' => count($surveys) > 0 ? round($totalDefects / count($surveys), 2) : 0
        ];
    }
}
