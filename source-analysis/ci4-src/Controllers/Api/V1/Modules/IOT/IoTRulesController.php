<?php
namespace App\Controllers\Api\V1\Modules\IOT;

use App\Controllers\Api\V1\BaseResourceController;

class IoTRulesController extends BaseResourceController
{
    public function index()
    {
        $db = \Config\Database::connect();
        $rules = $db->table('iot_alert_rules')
            ->select('iot_alert_rules.*, assets.name as asset_name')
            ->join('assets', 'assets.id = iot_alert_rules.asset_id', 'left')
            ->get()->getResultArray();
        
        return $this->respond(['data' => $rules]);
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();
        $rule = $db->table('iot_alert_rules')->where('id', $id)->get()->getRow();
        
        if (!$rule) {
            return $this->failNotFound('Rule not found');
        }
        
        return $this->respond(['data' => $rule]);
    }

    public function create()
    {
        $data = $this->request->getJSON(true);
        
        $db = \Config\Database::connect();
        $db->table('iot_alert_rules')->insert([
            'asset_id' => $data['asset_id'],
            'metric_type' => $data['metric_type'],
            'warning_threshold' => $data['warning_threshold'],
            'critical_threshold' => $data['critical_threshold'],
            'action' => $data['action'],
            'is_active' => $data['is_active'] ?? 1,
            'created_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respondCreated(['status' => 'success', 'message' => 'Rule created']);
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true);
        
        $db = \Config\Database::connect();
        $db->table('iot_alert_rules')->where('id', $id)->update([
            'asset_id' => $data['asset_id'],
            'metric_type' => $data['metric_type'],
            'warning_threshold' => $data['warning_threshold'],
            'critical_threshold' => $data['critical_threshold'],
            'action' => $data['action'],
            'is_active' => $data['is_active'] ?? 1,
            'updated_at' => date('Y-m-d H:i:s')
        ]);
        
        return $this->respond(['status' => 'success', 'message' => 'Rule updated']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        $db->table('iot_alert_rules')->where('id', $id)->delete();
        
        return $this->respond(['status' => 'success', 'message' => 'Rule deleted']);
    }
}
