<?php

namespace App\Services;

use App\Models\MeterModel;
use CodeIgniter\Database\Exceptions\DataException;
use Exception;

class MeterService
{
    protected $meterModel;

    public function __construct()
    {
        $this->meterModel = new MeterModel();
    }

    public function listMeters(string $nodeType, int $nodeId): array
    {
        $meters = $this->meterModel->getByNode($nodeType, $nodeId);
        return ['success' => true, 'data' => $meters];
    }

    public function createMeter(array $payload)
    {
        $required = ['asset_node_type','asset_node_id','meter_type','unit'];
        foreach ($required as $r) {
            if (!isset($payload[$r])) return ['success'=>false,'error'=>"Missing {$r}"];
        }
        $exists = $this->meterModel->where([
            'asset_node_type'=>$payload['asset_node_type'],
            'asset_node_id'=>$payload['asset_node_id'],
            'meter_type'=>$payload['meter_type']
        ])->first();
        if ($exists) return ['success'=>false,'error'=>'Meter already exists', 'data'=>$exists];

        try {
            $id = $this->meterModel->insert([
                'asset_node_type'=>$payload['asset_node_type'],
                'asset_node_id'=>$payload['asset_node_id'],
                'meter_type'=>$payload['meter_type'],
                'unit'=>$payload['unit'],
                'value'=>$payload['value'] ?? 0,
                'last_read_at'=>$payload['last_read_at'] ?? date('Y-m-d H:i:s'),
                'created_by'=>$payload['created_by'] ?? null
            ], true);
            return ['success'=>true,'id'=>$id];
        } catch (Exception $e) {
            return ['success'=>false,'error'=>$e->getMessage()];
        }
    }

    public function recordReading(int $meterId, float $newValue, ?int $userId = null)
    {
        $db = \Config\Database::connect();
        $db->transStart();
        try {
            $meter = $this->meterModel->find($meterId);
            if (!$meter) throw new \Exception("Meter not found");

            // persist reading history and update current meter in a transaction
            $rid = $this->meterModel->addReadingHistory($meterId, $newValue, date('Y-m-d H:i:s'), $userId);

            $db->transComplete();

            // enqueue for async recompute (non-blocking)
            $mq = new \App\Services\MeterQueueService();
            $mq->enqueue($meterId, ['meter_reading_id' => $rid, 'value' => $newValue, 'user_id' => $userId]);

            return ['success'=>true, 'meter_id'=>$meterId, 'reading_id'=>$rid];
        } catch (\Exception $e) {
            $db->transRollback();
            return ['success'=>false, 'error'=>$e->getMessage()];
        }
    }

    public function onMeterUpdated(int $meterId)
    {
        return ['success'=>true];
    }
}
