<?php
namespace App\Controllers\Api\V1\Modules\MRMP;

use App\Controllers\Api\V1\BaseResourceController;

class IoTDataController extends BaseResourceController
{
    protected $iotDeviceModel;
    protected $iotMetricsModel;
    protected $iotAlertsModel;

    public function __construct()
    {
        $this->iotDeviceModel = model('IoTDeviceModel');
        $this->iotMetricsModel = model('IoTMetricsModel');
        $this->iotAlertsModel = model('IoTAlertsModel');
    }

    public function getDevices()
    {
        $devices = $this->iotDeviceModel->findAll();
        return $this->respond(['data' => $devices]);
    }

    public function getDeviceMetrics($deviceId = null)
    {
        $range = $this->request->getGet('range') ?? '24h';
        $timeAgo = $this->parseTimeRange($range);
        
        $metrics = $this->iotMetricsModel
            ->where('device_id', $deviceId)
            ->where('timestamp >=', $timeAgo)
            ->orderBy('timestamp', 'DESC')
            ->findAll(1000);
        
        return $this->respond(['data' => $metrics]);
    }

    public function getAssetMetrics($assetId = null)
    {
        $range = $this->request->getGet('range') ?? '24h';
        $timeAgo = $this->parseTimeRange($range);
        
        $metrics = $this->iotMetricsModel
            ->where('asset_id', $assetId)
            ->where('timestamp >=', $timeAgo)
            ->orderBy('timestamp', 'DESC')
            ->findAll(1000);
        
        return $this->respond(['data' => $metrics]);
    }

    public function getAlerts()
    {
        $assetId = $this->request->getGet('asset_id');
        
        $builder = $this->iotAlertsModel
            ->select('iot_alerts.*, assets.name as asset_name')
            ->join('assets', 'assets.id = iot_alerts.asset_id')
            ->where('iot_alerts.acknowledged', 0)
            ->orderBy('iot_alerts.created_at', 'DESC');
        
        if ($assetId) {
            $builder->where('iot_alerts.asset_id', $assetId);
        }
        
        $alerts = $builder->findAll();
        return $this->respond(['data' => $alerts]);
    }

    public function acknowledgeAlert($alertId = null)
    {
        $this->iotAlertsModel->update($alertId, [
            'acknowledged' => 1,
            'acknowledged_at' => date('Y-m-d H:i:s'),
            'acknowledged_by' => $this->getUserId()
        ]);
        
        return $this->respond(['status' => 'success']);
    }

    public function ingest()
    {
        $data = $this->request->getJSON(true);
        
        $this->iotMetricsModel->insert([
            'device_id' => $data['device_id'],
            'asset_id' => $data['asset_id'],
            'metric_type' => $data['metric_type'],
            'value' => $data['value'],
            'timestamp' => $data['timestamp'] ?? date('Y-m-d H:i:s')
        ]);
        
        // Check thresholds
        $this->checkThresholds($data['asset_id'], $data['metric_type'], $data['value']);
        
        return $this->respond(['status' => 'success']);
    }

    private function checkThresholds($assetId, $metricType, $value)
    {
        $db = \Config\Database::connect();
        
        // Get active rules for this asset and metric
        $rules = $db->table('iot_alert_rules')
            ->where('asset_id', $assetId)
            ->where('metric_type', $metricType)
            ->where('is_active', 1)
            ->get()->getResultArray();
        
        foreach ($rules as $rule) {
            $severity = null;
            $threshold = null;
            
            if ($value >= $rule['critical_threshold']) {
                $severity = 'critical';
                $threshold = $rule['critical_threshold'];
            } elseif ($value >= $rule['warning_threshold']) {
                $severity = 'warning';
                $threshold = $rule['warning_threshold'];
            }
            
            if ($severity) {
                // Create alert
                $this->iotAlertsModel->insert([
                    'asset_id' => $assetId,
                    'metric_type' => $metricType,
                    'value' => $value,
                    'threshold' => $threshold,
                    'severity' => $severity,
                    'created_at' => date('Y-m-d H:i:s')
                ]);
                
                // Execute action
                $this->executeAlertAction($rule, $assetId, $value);
            }
        }
    }
    
    private function executeAlertAction($rule, $assetId, $value)
    {
        switch ($rule['action']) {
            case 'alert_and_email':
                // Send email notification
                break;
            case 'alert_and_wo':
                // Create work order
                $db = \Config\Database::connect();
                $db->table('work_orders')->insert([
                    'asset_id' => $assetId,
                    'work_type' => 'corrective',
                    'priority' => 'high',
                    'description' => "IoT Alert: {$rule['metric_type']} exceeded threshold ({$value})",
                    'status' => 'open',
                    'created_at' => date('Y-m-d H:i:s')
                ]);
                break;
            case 'shutdown':
                // Emergency shutdown logic
                break;
        }
    }

    private function parseTimeRange($range)
    {
        $intervals = [
            '1h' => '-1 hour',
            '24h' => '-24 hours',
            '7d' => '-7 days',
            '30d' => '-30 days'
        ];
        
        return date('Y-m-d H:i:s', strtotime($intervals[$range] ?? '-24 hours'));
    }

    private function getUserId()
    {
        return \App\Filters\JWTAuthFilter::getUserData()['id'] ?? null;
    }
}
