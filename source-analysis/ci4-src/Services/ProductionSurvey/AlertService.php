<?php

namespace App\Services\ProductionSurvey;

use App\Models\SurveyAlertRuleModel;
use App\Models\SurveyAlertModel;

class AlertService
{
    protected $ruleModel;
    protected $alertModel;

    public function __construct()
    {
        $this->ruleModel = new SurveyAlertRuleModel();
        $this->alertModel = new SurveyAlertModel();
    }

    public function checkAlerts(array $survey)
    {
        $rules = $this->ruleModel->where('active', 1)->findAll();
        
        foreach ($rules as $rule) {
            $triggered = false;
            $value = 0;
            
            switch ($rule['alert_type']) {
                case 'defects':
                    $value = $survey['defects_count'];
                    break;
                case 'downtime':
                    $value = $survey['downtime_minutes'];
                    break;
                case 'production':
                    $value = $survey['units_produced'] ?? 0;
                    break;
                case 'quality':
                    $value = $survey['scrap_quantity'] ?? 0;
                    break;
                case 'safety':
                    $value = $survey['safety_incident'] ?? 0;
                    break;
            }
            
            $triggered = $this->evaluateRule($value, $rule['threshold_value'], $rule['comparison']);
            
            if ($triggered) {
                $this->createAlert($survey['id'], $rule, $value);
            }
        }
    }

    protected function evaluateRule($value, $threshold, $comparison)
    {
        switch ($comparison) {
            case 'greater_than':
                return $value > $threshold;
            case 'less_than':
                return $value < $threshold;
            case 'equals':
                return $value == $threshold;
            default:
                return false;
        }
    }

    protected function createAlert($surveyId, $rule, $value)
    {
        $severity = $value > ($rule['threshold_value'] * 2) ? 'critical' : 'high';
        
        $this->alertModel->insert([
            'survey_id' => $surveyId,
            'rule_id' => $rule['id'],
            'alert_message' => "{$rule['rule_name']}: Value {$value} exceeds threshold {$rule['threshold_value']}",
            'severity' => $severity,
            'acknowledged' => 0
        ]);
        
        if ($rule['notification_method'] !== 'system') {
            $this->sendNotification($rule, $value);
        }
    }

    protected function sendNotification($rule, $value)
    {
        // Email/SMS notification logic here
        log_message('info', "Alert triggered: {$rule['rule_name']} - Value: {$value}");
    }
}
