<?php
namespace App\Services\ProductionSurvey;

use App\Models\SurveyWorkflowRuleModel;
use App\Models\SurveyWorkflowHistoryModel;
use App\Models\ProductionSurveyModel;

class WorkflowService {
    protected $ruleModel;
    protected $historyModel;
    protected $surveyModel;

    public function __construct() {
        $this->ruleModel = new SurveyWorkflowRuleModel();
        $this->historyModel = new SurveyWorkflowHistoryModel();
        $this->surveyModel = new ProductionSurveyModel();
    }

    public function processWorkflow($surveyId, $action) {
        $survey = $this->surveyModel->find($surveyId);
        $rules = $this->ruleModel->where('is_active', true)->orderBy('priority', 'DESC')->findAll();

        foreach ($rules as $rule) {
            if ($this->evaluateConditions($survey, json_decode($rule['conditions'], true))) {
                $this->executeActions($surveyId, $rule, json_decode($rule['actions'], true));
            }
        }
    }

    private function evaluateConditions($survey, $conditions) {
        foreach ($conditions as $condition) {
            $field = $condition['field'];
            $operator = $condition['operator'];
            $value = $condition['value'];

            if (!$this->compareValues($survey[$field] ?? null, $operator, $value)) {
                return false;
            }
        }
        return true;
    }

    private function executeActions($surveyId, $rule, $actions) {
        foreach ($actions as $action) {
            switch ($action['type']) {
                case 'auto_assign':
                    $this->surveyModel->update($surveyId, [
                        'assigned_to' => $action['user_id'],
                        'auto_assigned' => true
                    ]);
                    break;
                case 'auto_escalate':
                    $this->surveyModel->update($surveyId, [
                        'escalation_level' => ($action['level'] ?? 1),
                        'escalated_at' => date('Y-m-d H:i:s')
                    ]);
                    break;
            }

            $this->historyModel->insert([
                'survey_id' => $surveyId,
                'rule_id' => $rule['rule_id'],
                'action_type' => $action['type'],
                'automated' => true,
                'metadata' => json_encode($action)
            ]);
        }
    }

    private function compareValues($actual, $operator, $expected) {
        switch ($operator) {
            case '==': return $actual == $expected;
            case '!=': return $actual != $expected;
            case '>': return $actual > $expected;
            case '<': return $actual < $expected;
            case '>=': return $actual >= $expected;
            case '<=': return $actual <= $expected;
            case 'in': return in_array($actual, $expected);
            default: return false;
        }
    }
}
