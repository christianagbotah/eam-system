<?php

namespace App\Controllers\Api\V1\Modules\Core;

use App\Controllers\BaseController;
use App\Models\SurveyAlertRuleModel;
use App\Models\SurveyAlertModel;

class AlertController extends BaseController
{
    protected $ruleModel;
    protected $alertModel;

    public function __construct()
    {
        $this->ruleModel = new SurveyAlertRuleModel();
        $this->alertModel = new SurveyAlertModel();
    }

    public function getRules()
    {
        $rules = $this->ruleModel->findAll();

        return $this->response->setJSON([
            'status' => 'success',
            'data' => $rules
        ]);
    }

    public function createRule()
    {
        $data = $this->request->getJSON(true);

        $ruleId = $this->ruleModel->insert($data);

        return $this->response->setStatusCode(201)->setJSON([
            'status' => 'success',
            'message' => 'Alert rule created',
            'data' => ['id' => $ruleId]
        ]);
    }

    public function getAlerts()
    {
        $filters = [
            'acknowledged' => $this->request->getGet('acknowledged'),
            'severity' => $this->request->getGet('severity')
        ];

        $builder = $this->alertModel->builder();

        if ($filters['acknowledged'] !== null) {
            $builder->where('acknowledged', $filters['acknowledged']);
        }
        if ($filters['severity']) {
            $builder->where('severity', $filters['severity']);
        }

        $alerts = $builder->orderBy('created_at', 'DESC')->get()->getResultArray();

        return $this->response->setJSON([
            'status' => 'success',
            'data' => $alerts
        ]);
    }

    public function acknowledgeAlert($alertId)
    {
        $userId = $this->request->user_id ?? 1;

        $this->alertModel->update($alertId, [
            'acknowledged' => 1,
            'acknowledged_by' => $userId,
            'acknowledged_at' => date('Y-m-d H:i:s')
        ]);

        return $this->response->setJSON([
            'status' => 'success',
            'message' => 'Alert acknowledged'
        ]);
    }
}
